import { useState } from "react";
import {
  ChatContainer,
  MainContainer,
  Message,
  MessageInput,
  MessageList,
  TypingIndicator,
} from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import ReactMarkdown from "react-markdown";
import { sendChat } from "../api";
import type { ChatMessage } from "../api";
import styles from "./AdminChat.module.css";

type AdminChatProps = {
  onLogout: () => void;
};

export default function AdminChat({ onLogout }: AdminChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function send(text: string) {
    const value = text.trim();
    if (value === "" || loading) {
      return;
    }

    const next: ChatMessage[] = [...messages, { role: "user", content: value }];
    setMessages(next);
    setLoading(true);
    setError("");

    const result = await sendChat(next);

    if (!result.ok) {
      if (result.status === 401) {
        onLogout();
        return;
      }
      setError(result.error);
      setLoading(false);
      return;
    }

    setMessages([...next, { role: "assistant", content: result.reply }]);
    setLoading(false);
  }

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.title}>Modell testen</h2>
        <span className={styles.hint}>
          Direkter Chat mit dem lokalen Modell
        </span>
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
                loading ? (
                  <TypingIndicator content="Modell antwortet …" />
                ) : undefined
              }
            >
              {messages.length === 0 ? (
                <MessageList.Content>
                  <p className={styles.empty}>
                    Stell dem Modell eine Frage, um es zu testen.
                  </p>
                </MessageList.Content>
              ) : (
                messages.map((message, index) => {
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
                    >
                      {incoming && (
                        <Message.CustomContent>
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </Message.CustomContent>
                      )}
                    </Message>
                  );
                })
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
