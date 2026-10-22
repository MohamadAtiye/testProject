import { z } from "zod";
import { readAdminRecords } from "./db/records.js";
import { ServiceSchema } from "./schemas/records.js";
import { untrustedBlock } from "./lib/untrusted.js";
import type { MlToolCall, OpenAiTool } from "./ml/types.js";

const PROJECT_SERVICES = ServiceSchema.options;

const ContactArgsSchema = z.object({
  since: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const ProjectArgsSchema = z.object({
  since: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  service: ServiceSchema.optional(),
  status: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export function adminTools(): OpenAiTool[] {
  return [
    {
      type: "function",
      function: {
        name: "read_contact_messages",
        description: "Reads general contact requests. Newest first.",
        parameters: {
          type: "object",
          properties: {
            since: {
              type: "string",
              description: "Optional: only requests from this date onward (YYYY-MM-DD).",
            },
            limit: {
              type: "integer",
              description: "Optional: maximum number (1-50), default 20.",
            },
          },
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "read_project_requests",
        description: "Reads project requests. Newest first.",
        parameters: {
          type: "object",
          properties: {
            since: {
              type: "string",
              description: "Optional: only requests from this date onward (YYYY-MM-DD).",
            },
            service: {
              type: "string",
              enum: PROJECT_SERVICES,
            },
            status: {
              type: "string",
              description: 'Optional: processing status, e.g. "new".',
            },
            limit: {
              type: "integer",
              description: "Optional: maximum number (1-50), default 20.",
            },
          },
          additionalProperties: false,
        },
      },
    },
  ];
}

export function adminToolNames(): string[] {
  return adminTools().map((tool) => tool.function.name);
}

export async function executeAdminTool(
  name: string,
  rawArgs: unknown,
): Promise<Record<string, unknown>> {
  if (name === "read_contact_messages") {
    const args = ContactArgsSchema.parse(rawArgs);
    return readAdminRecords("contact", args.since ?? null, args.limit ?? 20);
  }

  if (name === "read_project_requests") {
    const args = ProjectArgsSchema.parse(rawArgs);
    return readAdminRecords(
      "project",
      args.since ?? null,
      args.limit ?? 20,
      args.service,
      args.status,
    );
  }

  throw new Error("Unbekanntes Werkzeug.");
}

export interface ToolLogger {
  error: (obj: unknown, msg?: string) => void;
}

export async function runToolCall(
  call: MlToolCall,
  logger?: ToolLogger,
): Promise<string> {
  const name = call.function.name;

  if (!adminToolNames().includes(name)) {
    return "Fehler: unbekanntes Werkzeug.";
  }

  let args: unknown;
  try {
    args = JSON.parse(call.function.arguments || "{}");
  } catch {
    return "Fehler: ungültige Werkzeugargumente.";
  }

  try {
    const payload = await executeAdminTool(name, args);
    return untrustedBlock(name, JSON.stringify(payload, null, 2));
  } catch (error) {
    if (logger) {
      logger.error({ err: error, tool: name }, "tool failed");
    } else {
      console.error("tool failed", { tool: name, error });
    }

    return "Fehler: Daten konnten nicht gelesen werden.";
  }
}
