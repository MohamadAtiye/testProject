import { randomBytes } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "./pool.js";
import { toIso } from "../lib/time.js";

export type ChatRole = "user" | "assistant";

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ChatHistoryMessage {
  role: ChatRole;
  content: string;
  createdAt: string;
}

interface ConversationRow extends RowDataPacket {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface MessageRow extends RowDataPacket {
  role: ChatRole;
  content: string;
  created_at: string;
}

function mapConversation(row: ConversationRow): ChatConversation {
  return {
    id: row.id,
    title: row.title || "Neuer Chat",
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    messageCount: Number(row.message_count ?? 0),
  };
}

export async function listConversations(adminEmail: string): Promise<ChatConversation[]> {
  const rows = await query<ConversationRow>(
    `SELECT
       c.id,
       c.title,
       c.created_at,
       c.updated_at,
       (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) AS message_count
       FROM chat_conversations c
      WHERE c.admin_email = ?
      ORDER BY c.updated_at DESC, c.created_at DESC`,
    [adminEmail],
  );

  return rows.map(mapConversation);
}

export async function getConversation(
  adminEmail: string,
  id: string,
): Promise<ChatConversation | null> {
  const rows = await query<ConversationRow>(
    `SELECT
       c.id,
       c.title,
       c.created_at,
       c.updated_at,
       (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) AS message_count
       FROM chat_conversations c
      WHERE c.id = ? AND c.admin_email = ?
      LIMIT 1`,
    [id, adminEmail],
  );

  return rows[0] ? mapConversation(rows[0]) : null;
}

export async function createConversation(
  adminEmail: string,
  title = "Neuer Chat",
): Promise<ChatConversation> {
  const id = randomBytes(8).toString("hex");

  await execute(
    "INSERT INTO chat_conversations (id, admin_email, title) VALUES (?, ?, ?)",
    [id, adminEmail, title.slice(0, 120)],
  );

  const conversation = await getConversation(adminEmail, id);
  if (!conversation) {
    throw new Error("Conversation could not be created.");
  }

  return conversation;
}

export async function appendChatMessage(
  adminEmail: string,
  conversationId: string,
  role: ChatRole,
  content: string,
): Promise<void> {
  const conversation = await getConversation(adminEmail, conversationId);
  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  await execute(
    "INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?)",
    [conversationId, role, content],
  );

  const title = content.replace(/\s+/g, " ").trim().slice(0, 80) || "Neuer Chat";

  await execute(
    `UPDATE chat_conversations
        SET title = CASE
              WHEN ? = 'user' AND (title = '' OR title = 'Neuer Chat') THEN ?
              ELSE title
            END,
            updated_at = UTC_TIMESTAMP()
      WHERE id = ? AND admin_email = ?`,
    [role, title, conversationId, adminEmail],
  );
}

export async function listConversationMessages(
  adminEmail: string,
  conversationId: string,
): Promise<{ conversation: ChatConversation; messages: ChatHistoryMessage[] } | null> {
  const conversation = await getConversation(adminEmail, conversationId);
  if (!conversation) {
    return null;
  }

  const rows = await query<MessageRow>(
    `SELECT role, content, created_at
       FROM chat_messages
      WHERE conversation_id = ?
      ORDER BY id ASC
      LIMIT 200`,
    [conversationId],
  );

  return {
    conversation,
    messages: rows.map((row) => ({
      role: row.role,
      content: row.content,
      createdAt: toIso(row.created_at),
    })),
  };
}

export async function deleteConversation(
  adminEmail: string,
  conversationId: string,
): Promise<boolean> {
  const result = await execute(
    "DELETE FROM chat_conversations WHERE id = ? AND admin_email = ?",
    [conversationId, adminEmail],
  );

  return result.affectedRows > 0;
}
