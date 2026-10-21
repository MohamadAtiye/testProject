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

export const ConversationParamsSchema = z.object({
  id: z.string().min(1).max(32),
});

export const ChatRequestSchema = z.object({
  conversationId: z.string().min(1).max(32),
  messages: z.array(ChatMessageSchema).min(1).max(20),
});

export const ChatResponseSchema = z.object({
  ok: z.literal(true),
  reply: z.string(),
});

export const ChatHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.string(),
});

export const ChatConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number().int(),
});

export const ConversationsResponseSchema = z.object({
  ok: z.literal(true),
  conversations: z.array(ChatConversationSchema),
});

export const CreateConversationResponseSchema = z.object({
  ok: z.literal(true),
  conversation: ChatConversationSchema,
});

export const ConversationMessagesResponseSchema = z.object({
  ok: z.literal(true),
  conversation: ChatConversationSchema,
  messages: z.array(ChatHistoryMessageSchema),
});
