import { z } from "zod";

export const HealthSchema = z.object({
  ok: z.boolean(),
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  time: z.iso.datetime(),
  components: z.object({
    database: z.enum(["up", "down"]),
    ml: z.enum(["up", "down"]),
  }),
});

export const PhoneSchema = z
  .string()
  .max(40)
  .regex(/^$|^[0-9+()\/\s.\-]{5,40}$/, "Bitte gib eine gültige Telefonnummer an.")
  .default("");
