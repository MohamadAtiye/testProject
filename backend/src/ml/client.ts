import { config } from "../config.js";
import { MlAssistResponseSchema, MlChatResponseSchema, type MlMessage, type OpenAiTool } from "./types.js";

export class MlError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "MlError";
    this.statusCode = statusCode;
  }
}

function headers(): Record<string, string> {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${config.ML_API_KEY}`,
  };
}

function timeoutSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(config.ML_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function post(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(`${config.ML_BASE_URL}${path}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal: timeoutSignal(signal),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new MlError("ML-Anfrage abgebrochen.");
    }
    throw new MlError("ML-Dienst nicht erreichbar.");
  }

  if (!response.ok) {
    throw new MlError(`ML-Dienst Fehler (${response.status}).`, 502);
  }

  return response;
}

export async function mlHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${config.ML_BASE_URL}/health`, {
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function mlAssist(draft: Record<string, unknown>): Promise<{ summary: string; suggestions: string[] }> {
  const response = await post("/v1/assist", { draft });
  const data = MlAssistResponseSchema.safeParse(await response.json());

  if (!data.success) {
    throw new MlError("Unerwartete Antwort vom ML-Dienst.");
  }

  return data.data;
}

export async function mlChat(input: {
  messages: MlMessage[];
  tools?: OpenAiTool[];
  context?: Record<string, unknown>;
}): Promise<{ message: { role: "assistant"; content: string; tool_calls: import("./types.js").MlToolCall[] } }> {
  const response = await post("/v1/chat", {
    profile: "admin",
    messages: input.messages,
    tools: input.tools,
    context: input.context,
  });

  const data = MlChatResponseSchema.safeParse(await response.json());

  if (!data.success) {
    throw new MlError("Unerwartete Antwort vom ML-Dienst.");
  }

  return data.data;
}

export function mlChatStream(input: {
  messages: MlMessage[];
  tools?: OpenAiTool[];
  context?: Record<string, unknown>;
  signal?: AbortSignal;
}): Promise<Response> {
  return post(
    "/v1/chat/stream",
    {
      profile: "admin",
      messages: input.messages,
      tools: input.tools,
      context: input.context,
    },
    input.signal,
  );
}
