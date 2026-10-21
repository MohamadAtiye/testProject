import { randomUUID } from "node:crypto";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { config } from "./config.js";
import { HttpError } from "./lib/errors.js";
import authPlugin from "./plugins/auth.js";
import adminRoutes from "./routes/admin.js";
import publicRoutes from "./routes/public.js";

export interface BuildAppOptions {
  logger?: boolean | object;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      options.logger ??
      (config.NODE_ENV === "development"
        ? {
            level: config.LOG_LEVEL,
            transport: {
              target: "pino-pretty",
              options: { colorize: true, translateTime: "SYS:standard" },
            },
          }
        : { level: config.LOG_LEVEL }),
    trustProxy: config.TRUST_PROXY,
    genReqId: (request) => {
      const incoming = request.headers["x-request-id"];
      if (
        typeof incoming === "string" &&
        /^[A-Za-z0-9._-]{8,64}$/.test(incoming)
      ) {
        return incoming;
      }
      return randomUUID();
    },
    requestIdHeader: "x-request-id",
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" },
  });

  await app.register(cors, {
    origin: config.ALLOWED_ORIGINS,
    credentials: true,
  });

  await app.register(rateLimit, {
    global: false,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Stadtlöwe API",
        description:
          "Public website endpoints, admin records and AI chat. Admin routes accept an HttpOnly cookie or a Bearer JWT.",
        version: "1.0.0",
      },
      servers: [{ url: "/" }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "admin_token",
          },
        },
      },
      tags: [
        { name: "public", description: "Public website endpoints" },
        { name: "admin", description: "Authenticated admin endpoints" },
        { name: "system", description: "Health and operations" },
      ],
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });

  await app.register(authPlugin);

  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("X-Request-Id", request.id);
    if (!reply.hasHeader("Cache-Control")) {
      reply.header("Cache-Control", "no-store");
    }
    return payload;
  });

  app.setNotFoundHandler(async (_request, reply) => {
    return reply.code(404).send({ ok: false, error: "Nicht gefunden." });
  });

  app.setErrorHandler(async (error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const errors: Record<string, string> = {};

      for (const item of error.validation) {
        const path =
          item.instancePath.replace(/^\//, "").replaceAll("/", ".") || "body";
        errors[path] = item.message ?? "Ungültiger Wert.";
      }

      return reply.code(422).send({
        ok: false,
        error: "Bitte prüfe deine Eingaben.",
        errors,
      });
    }

    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({
        ok: false,
        error: error.message,
        ...(error.details ? { errors: error.details } : {}),
      });
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        ok: false,
        error: error.message,
      });
    }

    request.log.error({ err: error }, "request failed");
    return reply.code(500).send({
      ok: false,
      error: "Interner Serverfehler.",
    });
  });

  await app.register(publicRoutes, { prefix: "/api/v1" });
  await app.register(adminRoutes, { prefix: "/api/v1/admin" });

  app.get(
    "/api/openapi.json",
    { schema: { hide: true } },
    async () => app.swagger(),
  );

  await app.register(swaggerUI, {
    routePrefix: "/api/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      persistAuthorization: true,
    },
  });

  return app;
}
