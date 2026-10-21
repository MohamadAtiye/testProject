import { z } from "zod";
import { PhoneSchema } from "./common.js";

export const ServiceSchema = z.enum(["design", "systems", "consulting", "mix"]);
export const EngagementSchema = z.enum(["project", "longterm"]);
export const TimelineKindSchema = z.enum(["fixed", "flexible", "asap"]);

export const ContactMessageSchema = z.object({
  email: z.email().max(254),
  phone: PhoneSchema,
  title: z.string().trim().min(1, "Bitte gib einen Titel an.").max(150),
  message: z.string().trim().min(1, "Bitte gib eine Nachricht ein.").max(5000),
});

export const ContactRecordSchema = z.object({
  name: z.string().trim().min(1, "Bitte gib deinen Namen an.").max(200),
  company: z.string().trim().max(200).default(""),
  email: z.email().max(254),
  phone: PhoneSchema,
});

export const TimelineStrictSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("fixed"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte gib ein gültiges Datum an."),
  }),
  z.object({
    kind: z.literal("flexible"),
    date: z.string().nullable().optional(),
  }),
  z.object({
    kind: z.literal("asap"),
    date: z.string().nullable().optional(),
  }),
]);

export const BudgetStrictSchema = z.union([
  z.object({
    unknown: z.literal(true),
    range: z.string().max(40).nullable().optional(),
  }),
  z.object({
    unknown: z.literal(false).optional(),
    range: z.string().trim().min(1).max(40),
  }),
]);

export const ProjectSubmitSchema = z.object({
  service: ServiceSchema,
  engagement: EngagementSchema,
  goal: z
    .string()
    .trim()
    .min(15, "Bitte beschreibe dein Vorhaben etwas genauer.")
    .max(5000, "Die Beschreibung ist zu lang (max. 5000 Zeichen)."),
  timeline: TimelineStrictSchema.optional(),
  budget: BudgetStrictSchema.optional(),
  contact: ContactRecordSchema,
  consent: z.literal(true, {
    error: "Bitte stimme der Verarbeitung deiner Daten zu.",
  }),
});

export const ProjectDraftSchema = z.object({
  service: ServiceSchema.optional(),
  engagement: EngagementSchema.optional(),
  goal: z.string().trim().max(5000).optional(),
  timeline: z
    .object({
      kind: TimelineKindSchema,
      date: z.string().optional(),
    })
    .optional(),
  budget: z
    .object({
      range: z.string().max(40).optional(),
      unknown: z.boolean().optional(),
    })
    .optional(),
});

export const ContactRecordResponseSchema = z.object({
  ok: z.literal(true),
  id: z.string(),
  message: z.string(),
});

export const ProjectRecordResponseSchema = z.object({
  ok: z.literal(true),
  id: z.string(),
});

export const AssistResponseSchema = z.object({
  ok: z.literal(true),
  summary: z.string(),
  suggestions: z.array(z.string()),
  missing: z.array(z.enum(["service", "engagement", "goal", "timeline", "budget"])),
});

export const ContactRecordItemSchema = z.object({
  id: z.string(),
  email: z.string(),
  phone: z.string(),
  title: z.string(),
  message: z.string(),
  createdAt: z.string(),
});

export const ProjectRecordItemSchema = z.object({
  id: z.string(),
  service: ServiceSchema,
  engagement: EngagementSchema,
  goal: z.string(),
  timeline: z
    .object({
      kind: TimelineKindSchema,
      date: z.string().nullable(),
    })
    .nullable(),
  budget: z
    .object({
      range: z.string().nullable(),
      unknown: z.boolean(),
    })
    .nullable(),
  contact: z.object({
    name: z.string(),
    company: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  consent: z.boolean(),
  status: z.string(),
  createdAt: z.string(),
});

export const CountBucketSchema = z.object({
  today: z.number().int(),
  week: z.number().int(),
  total: z.number().int(),
});

export const StatsResponseSchema = z.object({
  ok: z.literal(true),
  generatedAt: z.string(),
  contact: CountBucketSchema,
  project: CountBucketSchema,
  openProjects: CountBucketSchema,
});

export const RecordsQuerySchema = z.object({
  type: z.enum(["contact", "project"]),
});

export const RecordsResponseSchema = z.object({
  ok: z.literal(true),
  type: z.enum(["contact", "project"]),
  records: z.array(z.union([ContactRecordItemSchema, ProjectRecordItemSchema])),
});
