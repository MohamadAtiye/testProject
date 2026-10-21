import { api, apiErrorMessage } from "./client";
import type { paths } from "./schema";

type AssistRequest =
  paths["/api/v1/assist"]["post"]["requestBody"]["content"]["application/json"];

export type AssistDraft = AssistRequest;

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
    const { data, error, response } = await api.POST("/api/v1/assist", {
      body: draft,
      signal,
    });

    if (!response.ok || !data) {
      return {
        ok: false,
        error: apiErrorMessage(error, "Vorschläge derzeit nicht verfügbar."),
      };
    }

    return {
      ok: true,
      summary: typeof data.summary === "string" ? data.summary : "",
      suggestions: Array.isArray(data.suggestions)
        ? data.suggestions.filter(
            (item): item is string => typeof item === "string",
          )
        : [],
      missing: Array.isArray(data.missing)
        ? data.missing.filter((item) => typeof item === "string")
        : [],
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, error: "" };
    }
    return { ok: false, error: "Netzwerkfehler." };
  }
}
