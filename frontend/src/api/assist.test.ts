import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAssistSuggestions } from "./assist";

function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAssistSuggestions", () => {
  it("normalizes the server response", async () => {
    mockFetch({
      ok: true,
      summary: "Klingt spannend.",
      suggestions: ["Wenn du magst, …", 42, "Noch ein Hinweis"],
      missing: ["budget", 7],
    });

    const result = await fetchAssistSuggestions({ goal: "Website" });

    expect(result).toEqual({
      ok: true,
      summary: "Klingt spannend.",
      suggestions: ["Wenn du magst, …", "Noch ein Hinweis"],
      missing: ["budget"],
    });
  });

  it("returns the server error message", async () => {
    mockFetch({ ok: false, error: "Zu viele Anfragen." }, 429);

    const result = await fetchAssistSuggestions({ goal: "Website" });

    expect(result).toEqual({ ok: false, error: "Zu viele Anfragen." });
  });

  it("reports a network error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("network down");
    }));

    const result = await fetchAssistSuggestions({ goal: "Website" });

    expect(result).toEqual({ ok: false, error: "Netzwerkfehler." });
  });
});
