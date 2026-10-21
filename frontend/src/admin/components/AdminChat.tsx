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
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import { sendChatStream } from "../api";
import type { ChatMessage } from "../api";
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

export default function AdminChat({ onLogout }: AdminChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [streamingReply, setStreamingReply] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function send(text: string) {
    const value = text.trim();
    if (value === "" || loading) {
      return;
    }

    const next: ChatMessage[] = [...messages, { role: "user", content: value }];
    setMessages(next);
    setStreamingReply("");
    setLoading(true);
    setError("");

    const controller = new AbortController();
    abortRef.current = controller;

    const result = await sendChatStream(
      next,
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
  }

  function clear() {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setStreamingReply("");
    setError("");
    setLoading(false);
  }

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <span className={styles.title}>
          <span className={styles.dot} aria-hidden="true" />
          Modell testen
        </span>
        {messages.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={clear} disabled={loading}>
            Verlauf leeren
          </Button>
        ) : (
          <span className={styles.hint}>
            Direkter Chat mit dem lokalen Modell
          </span>
        )}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

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
              {messages.length === 0 ? (
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
              disabled={loading}
              onSend={(_html, textContent) => {
                void send(textContent);
              }}
            />
          </ChatContainer>
        </MainContainer>
      </div>
    </section>
  );
}
