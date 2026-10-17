import { useEffect, useRef, useState } from "react";
import Button from "../../components/Button";
import { sendChat } from "../api";
import type { ChatMessage } from "../api";
import styles from "./AdminChat.module.css";

type AdminChatProps = {
  onLogout: () => void;
};

export default function AdminChat({ onLogout }: AdminChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (text === "" || loading) {
      return;
    }

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
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

      <div className={styles.thread}>
        {messages.length === 0 ? (
          <p className={styles.empty}>
            Stell dem Modell eine Frage, um es zu testen.
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === "user" ? styles.rowUser : styles.rowBot
              }
            >
              <div
                className={
                  message.role === "user" ? styles.bubbleUser : styles.bubbleBot
                }
              >
                {message.content}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className={styles.rowBot}>
            <div className={styles.bubbleBot}>
              <span className={styles.typing}>Modell antwortet …</span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.composer}>
        <textarea
          className={styles.input}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Nachricht an das Modell … (Enter zum Senden)"
          rows={2}
        />
        <Button
          variant="primary"
          withArrow
          onClick={send}
          disabled={loading || input.trim() === ""}
        >
          Senden
        </Button>
      </div>
    </section>
  );
}
