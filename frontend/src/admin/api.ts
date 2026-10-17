export type Bucket = {
  today: number;
  week: number;
  total: number;
};

export type Stats = {
  generatedAt: string;
  contact: Bucket;
  project: Bucket;
};

export type StatsResult =
  | { ok: true; stats: Stats }
  | { ok: false; status: number };

export type RecordType = "contact" | "project";

export type ContactRecord = {
  id: string;
  email: string;
  phone?: string;
  title: string;
  message: string;
  createdAt: string;
};

export type ProjectRecord = {
  id: string;
  service: string;
  engagement: string;
  goal: string;
  timeline?: { kind: string; date?: string | null } | null;
  budget?: { range?: string | null; unknown?: boolean } | null;
  contact: { name: string; company?: string; email: string; phone?: string };
  createdAt: string;
};

export type AdminRecord = ContactRecord | ProjectRecord;

export type RecordsResult =
  | { ok: true; records: AdminRecord[] }
  | { ok: false; status: number };

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatResult =
  | { ok: true; reply: string }
  | { ok: false; status: number; error: string };

export async function fetchSession(): Promise<string | null> {
  try {
    const response = await fetch("/api/admin/me.php", {
      credentials: "same-origin",
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json().catch(() => null)) as
      | { email?: string }
      | null;
    return data?.email ?? null;
  } catch {
    return null;
  }
}

export async function loginAdmin(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch("/api/admin/login.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email, password }),
    });

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!response.ok || !data?.ok) {
      return { ok: false, error: data?.error ?? "Ungültige Zugangsdaten." };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Verbindungsfehler. Bitte versuche es erneut." };
  }
}

export async function logoutAdmin(): Promise<void> {
  try {
    await fetch("/api/admin/logout.php", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    // ignore - the UI resets regardless
  }
}

export async function fetchStats(): Promise<StatsResult> {
  try {
    const response = await fetch("/api/admin/stats.php", {
      credentials: "same-origin",
    });
    const data = (await response.json().catch(() => null)) as
      | (Stats & { ok?: boolean })
      | null;

    if (!response.ok || !data?.ok) {
      return { ok: false, status: response.status };
    }

    return { ok: true, stats: data };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function fetchRecords(type: RecordType): Promise<RecordsResult> {
  try {
    const response = await fetch(`/api/admin/records.php?type=${type}`, {
      credentials: "same-origin",
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; records?: AdminRecord[] }
      | null;

    if (!response.ok || !data?.ok || !Array.isArray(data.records)) {
      return { ok: false, status: response.status };
    }

    return { ok: true, records: data.records };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function sendChat(messages: ChatMessage[]): Promise<ChatResult> {
  try {
    const response = await fetch("/api/admin/chat.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ messages }),
    });

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; reply?: string; error?: string }
      | null;

    if (!response.ok || !data?.ok || typeof data.reply !== "string") {
      return {
        ok: false,
        status: response.status,
        error: data?.error ?? "Antwort fehlgeschlagen.",
      };
    }

    return { ok: true, reply: data.reply };
  } catch {
    return { ok: false, status: 0, error: "Modell nicht erreichbar." };
  }
}
