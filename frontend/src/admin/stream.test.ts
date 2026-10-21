import { afterEach, describe, expect, it, vi } from "vitest";
import { sendChatStream } from "./api";

function sseResponse(events: unknown[]): Response {
  const body = events
    .map((event) => `data: ${JSON.stringify(event)}\n\n`)
    .join("");

  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendChatStream", () => {
  it("forwards tokens and returns the final reply", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          { type: "token", content: "Hal" },
          { type: "token", content: "lo" },
          { type: "done", reply: "Hallo" },
        ]),
      ),
    );

    const tokens: string[] = [];
    const result = await sendChatStream(
      [{ role: "user", content: "hi" }],
      (token) => tokens.push(token),
    );

    expect(tokens).toEqual(["Hal", "lo"]);
    expect(result).toEqual({ ok: true, reply: "Hallo" });
  });

  it("surfaces a stream error event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([{ type: "error", error: "Modell nicht erreichbar." }]),
      ),
    );

    const result = await sendChatStream(
      [{ role: "user", content: "hi" }],
      () => undefined,
    );

    expect(result).toEqual({
      ok: false,
      status: 502,
      error: "Modell nicht erreichbar.",
    });
  });

  it("reports a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );

    const result = await sendChatStream(
      [{ role: "user", content: "hi" }],
      () => undefined,
    );

    expect(result).toEqual({
      ok: false,
      status: 0,
      error: "Modell nicht erreichbar.",
    });
  });
});
