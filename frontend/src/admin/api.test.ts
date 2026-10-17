import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchStats, sendChat } from "./api";

type MockOptions = {
  status?: number;
  body?: unknown;
  reject?: boolean;
};

function mockFetch({ status = 200, body = {}, reject = false }: MockOptions) {
  const fn = vi.fn(async () => {
    if (reject) {
      throw new TypeError("network down");
    }
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendChat", () => {
  it("returns the reply on success", async () => {
    mockFetch({ body: { ok: true, reply: "Hallo" } });

    const result = await sendChat([{ role: "user", content: "hi" }]);

    expect(result).toEqual({ ok: true, reply: "Hallo" });
  });

  it("surfaces the status and error on failure", async () => {
    mockFetch({ status: 401, body: { ok: false, error: "Nicht angemeldet." } });

    const result = await sendChat([{ role: "user", content: "hi" }]);

    expect(result).toEqual({
      ok: false,
      status: 401,
      error: "Nicht angemeldet.",
    });
  });

  it("reports a network error as status 0", async () => {
    mockFetch({ reject: true });

    const result = await sendChat([{ role: "user", content: "hi" }]);

    expect(result).toEqual({
      ok: false,
      status: 0,
      error: "Modell nicht erreichbar.",
    });
  });
});

describe("fetchStats", () => {
  it("returns the stats on success", async () => {
    const stats = {
      generatedAt: "2026-10-17T00:00:00+00:00",
      contact: { today: 1, week: 2, total: 3 },
      project: { today: 0, week: 1, total: 1 },
      openProjects: { today: 0, week: 1, total: 1 },
    };
    mockFetch({ body: { ok: true, ...stats } });

    const result = await fetchStats();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats.contact).toEqual(stats.contact);
      expect(result.stats.project).toEqual(stats.project);
      expect(result.stats.openProjects).toEqual(stats.openProjects);
    }
  });

  it("returns the status when unauthorized", async () => {
    mockFetch({ status: 401, body: { ok: false } });

    const result = await fetchStats();

    expect(result).toEqual({ ok: false, status: 401 });
  });
});
