import { z } from "zod";

export const LoginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
});

export const LoginResponseSchema = z.object({
  ok: z.literal(true),
  email: z.string(),
  token: z.string(),
});

export const MeResponseSchema = z.object({
  ok: z.literal(true),
  email: z.string(),
});

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(20),
});

export const ChatResponseSchema = z.object({
  ok: z.literal(true),
  reply: z.string(),
});
