import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  ChatContainer,
  MainContainer,
  Message,
  MessageInput,
  MessageList,
  TypingIndicator,
} from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import ReactMarkdown from "react-markdown";
import Icon from "../../components/Icon";
import {
  createConversation,
  deleteConversation,
  fetchConversationMessages,
  fetchConversations,
  sendChatStream,
} from "../api";
import type { ChatConversation, ChatMessage } from "../api";
import styles from "./AdminChat.module.css";

type AdminChatProps = {
  onLogout: () => void;
};

const starterPrompts = [
  "Was ist heute Neues eingegangen?",
  "Gibt es Anfragen, die noch unbeantwortet sind?",
  "Fasse die neuesten Projektanfragen zusammen",
  "Wie viele Anfragen kamen diese Woche?",
];

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export default function AdminChat({ onLogout }: AdminChatProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [error, setError] = useState("");
  const [streamingReply, setStreamingReply] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const loadSeq = useRef(0);

  async function loadConversation(id: string) {
    const seq = ++loadSeq.current;

    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setStreamingReply("");
    setError("");
    setActiveId(id);
    setMessages([]);
    setHistoryLoading(true);

    const result = await fetchConversationMessages(id);

    if (seq !== loadSeq.current) {
      return;
    }

    if (!result.ok) {
      if (result.status === 401) {
        onLogout();
        return;
      }

      setError(result.error);
      setHistoryLoading(false);
      return;
    }

    setMessages(
      result.messages.map(({ role, content }) => ({ role, content })),
    );
    setHistoryLoading(false);
  }

  async function refreshConversations(): Promise<void> {
    const result = await fetchConversations();

    if (result.ok) {
      setConversations(result.conversations);
    }
  }

  async function newConversation() {
    const current = conversations.find((item) => item.id === activeId);

    if (current && current.messageCount === 0 && messages.length === 0) {
      return;
    }

    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setStreamingReply("");
    setError("");

    const result = await createConversation();

    if (!result.ok) {
      if (result.status === 401) {
        onLogout();
        return;
      }

      setError(result.error);
      return;
    }

    setConversations((items) => [result.conversation, ...items]);
    setActiveId(result.conversation.id);
    setMessages([]);
    setHistoryLoading(false);
  }

  async function removeConversation(id: string) {
    if (id === activeId) {
      abortRef.current?.abort();
      abortRef.current = null;
      setLoading(false);
      setStreamingReply("");
    }

    const result = await deleteConversation(id);

    if (!result.ok) {
      if (result.status === 401) {
        onLogout();
        return;
      }

      setError(result.error);
      return;
    }

    const remaining = conversations.filter((item) => item.id !== id);
    setConversations(remaining);

    if (id !== activeId) {
      return;
    }

    const next = remaining[0];

    if (next) {
      await loadConversation(next.id);
    } else {
      loadSeq.current += 1;
      setActiveId(null);
      setMessages([]);
      setHistoryLoading(false);
    }
  }

  async function send(text: string) {
    const value = text.trim();

    if (value === "" || loading || historyLoading || conversationsLoading) {
      return;
    }

    const next: ChatMessage[] = [...messages, { role: "user", content: value }];
    setMessages(next);
    setStreamingReply("");
    setLoading(true);
    setError("");

    let conversationId = activeId;

    if (!conversationId) {
      const created = await createConversation();

      if (!created.ok) {
        if (created.status === 401) {
          onLogout();
          return;
        }

        setLoading(false);
        setError(created.error);
        return;
      }

      conversationId = created.conversation.id;
      setConversations((items) => [created.conversation, ...items]);
      setActiveId(conversationId);
    }

    const controller = new AbortController();
    abortRef.current = controller;

    // The UI can show a longer persisted history, but the model context is
    // bounded to the most recent turns.
    const modelMessages = next.slice(-20);

    const result = await sendChatStream(
      modelMessages,
      conversationId,
      (token) => setStreamingReply((current) => current + token),
      controller.signal,
    );

    if (controller.signal.aborted) {
      setLoading(false);
      setStreamingReply("");
      return;
    }

    abortRef.current = null;

    if (!result.ok) {
      if (result.status === 401) {
        onLogout();
        return;
      }

      setError(result.error);
      setLoading(false);
      setStreamingReply("");
      return;
    }

    setMessages([...next, { role: "assistant", content: result.reply }]);
    setStreamingReply("");
    setLoading(false);
    void refreshConversations();
  }

  useEffect(() => {
    let active = true;

    (async () => {
      const result = await fetchConversations();

      if (!active) {
        return;
      }

      if (!result.ok) {
        if (result.status === 401) {
          onLogout();
          return;
        }

        setError(result.error);
        setConversationsLoading(false);
        setHistoryLoading(false);
        return;
      }

      setConversations(result.conversations);

      const first = result.conversations[0];

      if (first) {
        setActiveId(first.id);

        const history = await fetchConversationMessages(first.id);

        if (!active) {
          return;
        }

        if (!history.ok) {
          if (history.status === 401) {
            onLogout();
            return;
          }

          setError(history.error);
        } else {
          setMessages(
            history.messages.map(({ role, content }) => ({ role, content })),
          );
        }
      }

      setConversationsLoading(false);
      setHistoryLoading(false);
    })();

    return () => {
      active = false;
      loadSeq.current += 1;
      abortRef.current?.abort();
    };
  }, [onLogout]);

  const activeConversation = conversations.find((item) => item.id === activeId);
  const busy = loading || historyLoading || conversationsLoading;

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <span className={styles.title}>
          <span className={styles.dot} aria-hidden="true" />
          Modell testen
        </span>
        <span className={styles.hint}>
          {activeConversation?.title ?? "Neuer Chat"}
        </span>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <button
            type="button"
            className={styles.newChat}
            onClick={() => void newConversation()}
            disabled={busy}
          >
            <Icon name="plus" size={16} />
            Neuer Chat
          </button>

          <div className={styles.conversationList}>
            {conversationsLoading ? (
              <p className={styles.emptySidebar}>Chats werden geladen …</p>
            ) : conversations.length === 0 ? (
              <p className={styles.emptySidebar}>Noch keine Chats.</p>
            ) : (
              conversations.map((conversation) => {
                const active = conversation.id === activeId;

                return (
                  <div
                    key={conversation.id}
                    className={[
                      styles.conversation,
                      active ? styles.conversationActive : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <button
                      type="button"
                      className={styles.conversationMain}
                      onClick={() => void loadConversation(conversation.id)}
                      disabled={loading && active}
                    >
                      <span className={styles.conversationTitle}>
                        {conversation.title}
                      </span>
                      <span className={styles.conversationMeta}>
                        {formatDate(conversation.updatedAt)} ·{" "}
                        {conversation.messageCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      aria-label={`Chat ${conversation.title} löschen`}
                      onClick={() => void removeConversation(conversation.id)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <div className={styles.chat}>
          <MainContainer>
            <ChatContainer>
              <MessageList
                autoScrollToBottom
                scrollBehavior="smooth"
                typingIndicator={
                  loading && streamingReply === "" ? (
                    <TypingIndicator content="Modell antwortet …" />
                  ) : undefined
                }
              >
                {historyLoading ? (
                  <MessageList.Content>
                    <p className={styles.emptyText}>Chat wird geladen …</p>
                  </MessageList.Content>
                ) : messages.length === 0 ? (
                  <MessageList.Content>
                    <div className={styles.empty}>
                      <Icon
                        name="sparkles"
                        size={22}
                        className={styles.emptyIcon}
                      />
                      <p className={styles.emptyText}>
                        Stell dem Modell eine Frage, um es zu testen.
                      </p>
                      <div className={styles.pills}>
                        {starterPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            className={styles.pill}
                            onClick={() => void send(prompt)}
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </MessageList.Content>
                ) : (
                  <>
                    {messages.map((message, index) => {
                      const incoming = message.role === "assistant";

                      return (
                        <Message
                          key={index}
                          model={{
                            message: incoming ? undefined : message.content,
                            sender: incoming ? "Modell" : "Admin",
                            direction: incoming ? "incoming" : "outgoing",
                            position: "single",
                          }}
                          avatarPosition={incoming ? "tl" : "tr"}
                        >
                          <Avatar size="sm" className={styles.avatar}>
                            <Icon
                              name={incoming ? "sparkles" : "people"}
                              size={15}
                            />
                          </Avatar>
                          {incoming && (
                            <Message.CustomContent>
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </Message.CustomContent>
                          )}
                        </Message>
                      );
                    })}

                    {streamingReply !== "" && (
                      <Message
                        key="streaming"
                        model={{
                          message: undefined,
                          sender: "Modell",
                          direction: "incoming",
                          position: "single",
                        }}
                        avatarPosition="tl"
                      >
                        <Avatar size="sm" className={styles.avatar}>
                          <Icon name="sparkles" size={15} />
                        </Avatar>
                        <Message.CustomContent>
                          <ReactMarkdown>{streamingReply}</ReactMarkdown>
                        </Message.CustomContent>
                      </Message>
                    )}
                  </>
                )}
              </MessageList>

              <MessageInput
                placeholder="Nachricht an das Modell …"
                attachButton={false}
                disabled={busy}
                onSend={(_html, textContent) => {
                  void send(textContent);
                }}
              />
            </ChatContainer>
          </MainContainer>
        </div>
      </div>
    </section>
  );
}
