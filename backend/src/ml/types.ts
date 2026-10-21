import { z } from "zod";

export const MlToolCallSchema = z.object({
  id: z.string(),
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
});

export const MlAssistantMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.string(),
  tool_calls: z.array(MlToolCallSchema).default([]),
});

export const MlChatResponseSchema = z.object({
  message: MlAssistantMessageSchema,
});

export const MlAssistResponseSchema = z.object({
  summary: z.string(),
  suggestions: z.array(z.string()),
});

export type MlToolCall = z.infer<typeof MlToolCallSchema>;

export interface OpenAiTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface MlMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: MlToolCall[];
  tool_call_id?: string;
}
