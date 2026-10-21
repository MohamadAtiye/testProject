import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createConversation,
  deleteConversation,
  fetchConversationMessages,
  fetchConversations,
  fetchStats,
} from "./api";

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


const conversation = {
  id: "abc123",
  title: "Hallo",
  createdAt: "2026-10-21T18:00:00.000Z",
  updatedAt: "2026-10-21T18:00:00.000Z",
  messageCount: 1,
};

describe("chat conversations", () => {
  it("loads conversations", async () => {
    mockFetch({ body: { ok: true, conversations: [conversation] } });

    const result = await fetchConversations();

    expect(result).toEqual({ ok: true, conversations: [conversation] });
  });

  it("loads one conversation", async () => {
    const messages = [
      {
        role: "user",
        content: "Hallo",
        createdAt: "2026-10-21T18:00:00.000Z",
      },
    ];
    mockFetch({ body: { ok: true, conversation, messages } });

    const result = await fetchConversationMessages("abc123");

    expect(result).toEqual({ ok: true, conversation, messages });
  });

  it("creates a conversation", async () => {
    const empty = { ...conversation, messageCount: 0 };
    mockFetch({ status: 201, body: { ok: true, conversation: empty } });

    const result = await createConversation();

    expect(result).toEqual({ ok: true, conversation: empty });
  });

  it("deletes a conversation", async () => {
    mockFetch({ body: { ok: true } });

    const result = await deleteConversation("abc123");

    expect(result).toEqual({ ok: true });
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
