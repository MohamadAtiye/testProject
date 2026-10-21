import { adminTools, runToolCall, type ToolLogger } from "../tools.js";
import { mlChat, MlError, mlChatStream } from "../ml/client.js";
import type { MlMessage } from "../ml/types.js";
import { todayIsoDate } from "../lib/time.js";

const MAX_ITERATIONS = 4;

export interface ChatInputMessage {
  role: "user" | "assistant";
  content: string;
}

export type StreamEvent =
  | { type: "token"; content: string }
  | { type: "tool"; name: string }
  | { type: "done"; reply: string }
  | { type: "error"; error: string };

function context(): Record<string, unknown> {
  return { date: todayIsoDate() };
}

function toMlMessages(messages: ChatInputMessage[]): MlMessage[] {
  return messages.map((message) => ({ role: message.role, content: message.content }));
}

export async function runAdminChat(messages: ChatInputMessage[]): Promise<string> {
  const conversation = toMlMessages(messages);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    const result = await mlChat({
      messages: conversation,
      tools: adminTools(),
      context: context(),
    });

    if (result.message.tool_calls.length === 0) {
      return result.message.content.trim();
    }

    conversation.push({
      role: "assistant",
      content: result.message.content,
      tool_calls: result.message.tool_calls,
    });

    for (const call of result.message.tool_calls) {
      conversation.push({
        role: "tool",
        tool_call_id: call.id,
        content: await runToolCall(call),
      });
    }
  }

  const final = await mlChat({
    messages: conversation,
    context: context(),
  });

  return final.message.content.trim();
}

interface SseFrame {
  data: string;
}

async function* readSse(response: Response): AsyncGenerator<SseFrame> {
  if (!response.body) {
    throw new MlError("ML-Stream ohne Inhalt.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true }).replace(/\r/g, "");
      let boundary = buffer.indexOf("\n\n");

      while (boundary !== -1) {
        const rawFrame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const dataLines = rawFrame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim());

        if (dataLines.length > 0) {
          yield { data: dataLines.join("\n") };
        }

        boundary = buffer.indexOf("\n\n");
      }
    }

    if (buffer.trim() !== "") {
      const dataLines = buffer
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());

      if (dataLines.length > 0) {
        yield { data: dataLines.join("\n") };
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Tool decisions are made with non-streaming calls because small local models
 * are much more reliable at tool-call JSON that way. Once the tools have run,
 * the final answer is generated as a real stream.
 */
export async function* streamAdminChat(
  messages: ChatInputMessage[],
  options: {
    signal?: AbortSignal;
    logger?: ToolLogger;
  } = {},
): AsyncGenerator<StreamEvent> {
  const conversation = toMlMessages(messages);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    const result = await mlChat({
      messages: conversation,
      tools: adminTools(),
      context: context(),
    });

    if (result.message.tool_calls.length === 0) {
      break;
    }

    conversation.push({
      role: "assistant",
      content: result.message.content,
      tool_calls: result.message.tool_calls,
    });

    for (const call of result.message.tool_calls) {
      yield { type: "tool", name: call.function.name };
      conversation.push({
        role: "tool",
        tool_call_id: call.id,
        content: await runToolCall(call, options.logger),
      });
    }
  }

  const response = await mlChatStream({
    messages: conversation,
    context: context(),
    signal: options.signal,
  });

  let content = "";

  for await (const frame of readSse(response)) {
    if (frame.data === "[DONE]") {
      break;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(frame.data);
    } catch {
      continue;
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      "error" in parsed &&
      typeof parsed.error === "string"
    ) {
      throw new MlError(parsed.error);
    }

    const delta = (
      parsed as {
        choices?: Array<{ delta?: { content?: string } }>;
      }
    ).choices?.[0]?.delta;

    if (typeof delta?.content === "string" && delta.content !== "") {
      content += delta.content;
      yield { type: "token", content: delta.content };
    }
  }

  if (content.trim() === "") {
    throw new MlError("Keine Antwort erhalten.");
  }

  yield { type: "done", reply: content.trim() };
}
