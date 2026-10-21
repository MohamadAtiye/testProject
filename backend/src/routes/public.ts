import { randomBytes } from "node:crypto";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { config } from "../config.js";
import { dbHealth } from "../db/pool.js";
import { createContact, createProject, recordCounts } from "../db/records.js";
import { HttpError } from "../lib/errors.js";
import { nowIso } from "../lib/time.js";
import { mlAssist, mlHealth, MlError } from "../ml/client.js";
import { HealthSchema } from "../schemas/common.js";
import {
  AssistResponseSchema,
  ContactMessageSchema,
  ContactRecordResponseSchema,
  ProjectDraftSchema,
  ProjectRecordResponseSchema,
  ProjectSubmitSchema,
} from "../schemas/records.js";

function id(): string {
  return randomBytes(8).toString("hex");
}

const publicRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        tags: ["system"],
        summary: "Health check",
        description: "Reports MySQL and ML service health.",
        response: {
          200: HealthSchema,
          503: HealthSchema,
        },
      },
    },
    async (_request, reply) => {
      const [database, ml] = await Promise.all([dbHealth(), mlHealth()]);
      const status = !database ? "unhealthy" : ml ? "healthy" : "degraded";

      return reply.code(database ? 200 : 503).send({
        ok: database,
        status,
        time: nowIso(),
        components: {
          database: database ? "up" : "down",
          ml: ml ? "up" : "down",
        },
      });
    },
  );

  app.get(
    "/metrics",
    {
      schema: {
        hide: true,
        querystring: z.object({
          token: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const configured = config.METRICS_TOKEN;
      const headerToken = request.headers["x-metrics-token"];
      const provided =
        typeof headerToken === "string" ? headerToken : (request.query.token ?? "");

      if (configured === "" || provided !== configured) {
        return reply.code(404).send({ ok: false, error: "Nicht gefunden." });
      }

      const [contact, project, open] = await Promise.all([
        recordCounts("contact"),
        recordCounts("project"),
        recordCounts("project", { status: "new" }),
      ]);

      return reply
        .type("text/plain; version=0.0.4; charset=utf-8")
        .header("Cache-Control", "no-store")
        .send(
          [
            "# HELP stadtloewe_contact_requests Contact requests by period.",
            "# TYPE stadtloewe_contact_requests gauge",
            `stadtloewe_contact_requests{period="today"} ${contact.today}`,
            `stadtloewe_contact_requests{period="week"} ${contact.week}`,
            `stadtloewe_contact_requests{period="total"} ${contact.total}`,
            "# HELP stadtloewe_project_requests Project requests by period.",
            "# TYPE stadtloewe_project_requests gauge",
            `stadtloewe_project_requests{period="today"} ${project.today}`,
            `stadtloewe_project_requests{period="week"} ${project.week}`,
            `stadtloewe_project_requests{period="total"} ${project.total}`,
            "# HELP stadtloewe_open_projects Project requests still in status new.",
            "# TYPE stadtloewe_open_projects gauge",
            `stadtloewe_open_projects ${open.total}`,
            "",
          ].join("\n"),
        );
    },
  );

  app.post(
    "/contact",
    {
      config: {
        rateLimit: {
          max: config.CONTACT_RATE_LIMIT,
          timeWindow: config.RATE_WINDOW_MS,
        },
      },
      schema: {
        tags: ["public"],
        summary: "Submit a contact request",
        body: ContactMessageSchema,
        response: {
          201: ContactRecordResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const contactId = id();

      try {
        await createContact({
          id: contactId,
          ...request.body,
          ip: request.ip,
        });
      } catch (error) {
        request.log.error({ err: error }, "contact store failed");
        throw new HttpError(500, "Speichern derzeit nicht möglich.");
      }

      return reply.code(201).send({
        ok: true,
        id: contactId,
        message: "Nachricht gespeichert.",
      });
    },
  );

  app.post(
    "/projects",
    {
      config: {
        rateLimit: {
          max: config.PROJECT_RATE_LIMIT,
          timeWindow: config.RATE_WINDOW_MS,
        },
      },
      schema: {
        tags: ["public"],
        summary: "Submit a project request",
        body: ProjectSubmitSchema,
        response: {
          201: ProjectRecordResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const projectId = id();
      const body = request.body;

      try {
        await createProject({
          id: projectId,
          service: body.service,
          engagement: body.engagement,
          goal: body.goal,
          timeline: body.timeline
            ? { kind: body.timeline.kind, date: body.timeline.date ?? null }
            : null,
          budget: body.budget
            ? { range: body.budget.range ?? null, unknown: body.budget.unknown ?? false }
            : null,
          contact: body.contact,
          consent: body.consent,
          status: "new",
          ip: request.ip,
        });
      } catch (error) {
        request.log.error({ err: error }, "project store failed");
        throw new HttpError(500, "Speichern derzeit nicht möglich.");
      }

      return reply.code(201).send({ ok: true, id: projectId });
    },
  );

  app.post(
    "/assist",
    {
      config: {
        rateLimit: {
          max: config.ASSIST_RATE_LIMIT,
          timeWindow: config.ASSIST_RATE_WINDOW_MS,
        },
      },
      schema: {
        tags: ["public"],
        summary: "Get optional AI suggestions for a project draft",
        description:
          "The draft is whitelisted and sent to the ML service without contact data. The ML service has no data access.",
        body: ProjectDraftSchema,
        response: {
          200: AssistResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const draft = request.body;

      if (!draft.service && !draft.goal?.trim()) {
        throw new HttpError(422, "Keine Eingaben übermittelt.");
      }

      let result: { summary: string; suggestions: string[] };

      try {
        result = await mlAssist(draft as Record<string, unknown>);
      } catch (error) {
        if (error instanceof MlError) {
          request.log.error({ err: error }, "assist model failed");
          throw new HttpError(502, "Assistent derzeit nicht verfügbar.");
        }
        throw error;
      }

      const missing: Array<"service" | "engagement" | "goal" | "timeline" | "budget"> = [];

      if (!draft.service) missing.push("service");
      if (!draft.engagement) missing.push("engagement");
      if (!draft.goal?.trim()) missing.push("goal");
      if (!draft.timeline) missing.push("timeline");
      if (!draft.budget) missing.push("budget");

      return reply.send({
        ok: true,
        summary: result.summary,
        suggestions: result.suggestions,
        missing,
      });
    },
  );
};

export default publicRoutes;
