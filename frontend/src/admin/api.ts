import { api, apiErrorMessage } from "../api/client";
import type { paths } from "../api/schema";

type StatsResponse =
  paths["/api/v1/admin/stats"]["get"]["responses"][200]["content"]["application/json"];

export type Stats = Omit<StatsResponse, "ok">;
export type Bucket = Stats["contact"];

export type StatsResult =
  | { ok: true; stats: Stats }
  | { ok: false; status: number };

export type RecordType = "contact" | "project";

type RecordsResponse =
  paths["/api/v1/admin/records"]["get"]["responses"][200]["content"]["application/json"];

export type AdminRecord = RecordsResponse["records"][number];
export type ContactRecord = Extract<AdminRecord, { title: string }>;
export type ProjectRecord = Extract<AdminRecord, { service: string }>;

export type RecordsResult =
  | { ok: true; records: AdminRecord[] }
  | { ok: false; status: number };

type ChatRequest =
  paths["/api/v1/admin/chat"]["post"]["requestBody"]["content"]["application/json"];

export type ChatMessage = ChatRequest["messages"][number];

export type ChatResult =
  | { ok: true; reply: string }
  | { ok: false; status: number; error: string };

export async function fetchSession(): Promise<string | null> {
  try {
    const { data, response } = await api.GET("/api/v1/admin/me");
    if (!response.ok || !data) {
      return null;
    }
    return data.email;
  } catch {
    return null;
  }
}

export async function loginAdmin(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error, response } = await api.POST("/api/v1/admin/login", {
      body: { email, password },
    });

    if (!response.ok || !data) {
      return {
        ok: false,
        error: apiErrorMessage(error, "Ungültige Zugangsdaten."),
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Verbindungsfehler. Bitte versuche es erneut." };
  }
}

export async function logoutAdmin(): Promise<void> {
  try {
    await api.POST("/api/v1/admin/logout");
  } catch {
    // The UI resets regardless.
  }
}

export async function fetchStats(): Promise<StatsResult> {
  try {
    const { data, response } = await api.GET("/api/v1/admin/stats");

    if (!response.ok || !data) {
      return { ok: false, status: response.status };
    }

    return {
      ok: true,
      stats: {
        generatedAt: data.generatedAt,
        contact: data.contact,
        project: data.project,
        openProjects: data.openProjects,
      },
    };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function fetchRecords(type: RecordType): Promise<RecordsResult> {
  try {
    const { data, response } = await api.GET("/api/v1/admin/records", {
      params: { query: { type } },
    });

    if (!response.ok || !data) {
      return { ok: false, status: response.status };
    }

    return { ok: true, records: data.records };
  } catch {
    return { ok: false, status: 0 };
  }
}


type StreamEvent =
  | { type: "token"; content: string }
  | { type: "tool"; name: string }
  | { type: "done"; reply: string }
  | { type: "error"; error: string };

export async function sendChatStream(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<ChatResult> {
  try {
    const response = await fetch("/api/v1/admin/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ messages }),
      signal,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      return {
        ok: false,
        status: response.status,
        error: body?.error ?? "Antwort fehlgeschlagen.",
      };
    }

    if (!response.body) {
      return { ok: false, status: 0, error: "Keine Antwort erhalten." };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let reply = "";

    const handleFrame = (frame: string): string | null => {
      const data = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");

      if (data === "") {
        return null;
      }

      let event: StreamEvent;
      try {
        event = JSON.parse(data) as StreamEvent;
      } catch {
        return null;
      }

      if (event.type === "token") {
        onToken(event.content);
      } else if (event.type === "done") {
        reply = event.reply;
      } else if (event.type === "error") {
        return event.error;
      }

      return null;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true }).replace(/\r/g, "");
      let boundary = buffer.indexOf("\n\n");

      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const streamError = handleFrame(frame);

        if (streamError) {
          return { ok: false, status: 502, error: streamError };
        }

        boundary = buffer.indexOf("\n\n");
      }
    }

    if (buffer.trim() !== "") {
      const streamError = handleFrame(buffer);
      if (streamError) {
        return { ok: false, status: 502, error: streamError };
      }
    }

    if (reply === "") {
      return { ok: false, status: 502, error: "Keine Antwort erhalten." };
    }

    return { ok: true, reply };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, status: 0, error: "" };
    }
    return { ok: false, status: 0, error: "Modell nicht erreichbar." };
  }
}
