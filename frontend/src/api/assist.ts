export type AssistDraft = {
  service?: string;
  engagement?: string;
  goal?: string;
  timeline?: { kind: string; date?: string };
  budget?: { range?: string; unknown?: boolean };
};

export type AssistSuggestions = {
  summary: string;
  suggestions: string[];
  missing: string[];
};

export type AssistResult =
  | ({ ok: true } & AssistSuggestions)
  | { ok: false; error: string };

export async function fetchAssistSuggestions(
  draft: AssistDraft,
  signal?: AbortSignal,
): Promise<AssistResult> {
  try {
    const response = await fetch("/api/assist.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
      signal,
    });

    const data = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          summary?: string;
          suggestions?: unknown;
          missing?: unknown;
          error?: string;
        }
      | null;

    if (!response.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error ?? "Vorschläge derzeit nicht verfügbar.",
      };
    }

    const suggestions = Array.isArray(data.suggestions)
      ? data.suggestions.filter((item): item is string => typeof item === "string")
      : [];

    const missing = Array.isArray(data.missing)
      ? data.missing.filter((item): item is string => typeof item === "string")
      : [];

    return {
      ok: true,
      summary: typeof data.summary === "string" ? data.summary : "",
      suggestions,
      missing,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, error: "" };
    }
    return { ok: false, error: "Netzwerkfehler." };
  }
}
