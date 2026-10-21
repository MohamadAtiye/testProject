import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import bcrypt from "bcryptjs";
import { config } from "../config.js";
import { findAdminByEmail } from "../db/admins.js";
import { findRecords, recordCounts } from "../db/records.js";
import { verifyAdmin, signAdminToken, setAdminCookie, clearAdminCookie } from "../lib/auth.js";
import { HttpError } from "../lib/errors.js";
import { assertCookieRequestOrigin, assertTrustedOrigin } from "../lib/security.js";
import { nowIso } from "../lib/time.js";
import { MlError } from "../ml/client.js";
import {
  ChatRequestSchema,
  ChatResponseSchema,
  LoginResponseSchema,
  LoginSchema,
  MeResponseSchema,
} from "../schemas/admin.js";
import {
  RecordsQuerySchema,
  RecordsResponseSchema,
  StatsResponseSchema,
} from "../schemas/records.js";
import { runAdminChat, streamAdminChat } from "../services/chat.js";

const DUMMY_HASH = "$2b$12$9QWUyJ/XJOfcNdXHBStf0OIq7LGwbnhwuPd2GDyS3HdqNdDRHZtIK";

const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: config.LOGIN_RATE_LIMIT,
          timeWindow: config.LOGIN_RATE_WINDOW_MS,
        },
      },
      schema: {
        tags: ["admin"],
        summary: "Sign in and receive a JWT",
        description:
          "Returns a signed JWT. Browsers also receive an HttpOnly cookie; mobile clients use the token as a Bearer token.",
        body: LoginSchema,
        response: {
          200: LoginResponseSchema,
        },
      },
    },
    async (request, reply) => {
      assertTrustedOrigin(request);

      const admin = await findAdminByEmail(request.body.email.toLowerCase());
      const valid = await bcrypt.compare(
        request.body.password,
        admin?.passwordHash ?? DUMMY_HASH,
      );

      if (!admin || !valid) {
        request.log.warn({ email: request.body.email }, "admin login failed");
        throw new HttpError(401, "Ungültige Zugangsdaten.");
      }

      const token = signAdminToken(app, admin);
      setAdminCookie(reply, token);

      return reply.send({ ok: true, email: admin.email, token });
    },
  );

  app.post(
    "/logout",
    {
      schema: {
        tags: ["admin"],
        summary: "Clear the admin session cookie",
        response: {
          200: MeResponseSchema.omit({ email: true }),
        },
      },
    },
    async (request, reply) => {
      assertTrustedOrigin(request);
      clearAdminCookie(reply);
      return reply.send({ ok: true });
    },
  );

  app.get(
    "/me",
    {
      schema: {
        tags: ["admin"],
        summary: "Current admin",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        response: {
          200: MeResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const admin = await verifyAdmin(request);
      return reply.send({ ok: true, email: admin.email });
    },
  );

  app.get(
    "/stats",
    {
      schema: {
        tags: ["admin"],
        summary: "Dashboard counts",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        response: {
          200: StatsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await verifyAdmin(request);

      const [contact, project, openProjects] = await Promise.all([
        recordCounts("contact"),
        recordCounts("project"),
        recordCounts("project", { status: "new" }),
      ]);

      return reply.send({
        ok: true,
        generatedAt: nowIso(),
        contact,
        project,
        openProjects,
      });
    },
  );

  app.get(
    "/records",
    {
      schema: {
        tags: ["admin"],
        summary: "List contact or project records",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        querystring: RecordsQuerySchema,
        response: {
          200: RecordsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await verifyAdmin(request);

      const records = await findRecords(request.query.type, { limit: 500 });

      return reply.send({
        ok: true,
        type: request.query.type,
        records,
      });
    },
  );

  app.post(
    "/chat",
    {
      schema: {
        tags: ["admin"],
        summary: "Chat with the local model",
        description:
          "Server-owned prompts, read-only data tools, and a bounded tool loop. Customer text is wrapped as untrusted data.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        body: ChatRequestSchema,
        response: {
          200: ChatResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await verifyAdmin(request);
      assertCookieRequestOrigin(request);

      try {
        const response = await runAdminChat(request.body.messages);

        if (response === "") {
          throw new HttpError(502, "Keine Antwort erhalten.");
        }

        return reply.send({ ok: true, reply: response });
      } catch (error) {
        if (error instanceof MlError) {
          request.log.error({ err: error }, "admin chat failed");
          throw new HttpError(502, "Modell derzeit nicht erreichbar.");
        }
        throw error;
      }
    },
  );

  app.post(
    "/chat/stream",
    {
      schema: {
        tags: ["admin"],
        summary: "Stream a chat response over SSE",
        description:
          "Server-Sent Events: token, tool, done, error. Uses the same authenticated tool loop as /chat.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        body: ChatRequestSchema,
        hide: false,
      },
    },
    async (request, reply) => {
      await verifyAdmin(request);
      assertCookieRequestOrigin(request);

      reply.hijack();

      const raw = reply.raw;
      raw.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "X-Request-Id": request.id,
      });

      const controller = new AbortController();
      request.raw.on("close", () => controller.abort());

      const send = (event: unknown): void => {
        if (!raw.writableEnded) {
          raw.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      };

      try {
        for await (const event of streamAdminChat(request.body.messages, {
          signal: controller.signal,
          logger: request.log,
        })) {
          send(event);
        }
      } catch (error) {
        request.log.error({ err: error }, "admin chat stream failed");
        send({ type: "error", error: "Modell derzeit nicht erreichbar." });
      } finally {
        if (!raw.writableEnded) {
          raw.end();
        }
      }
    },
  );
};

export default adminRoutes;
