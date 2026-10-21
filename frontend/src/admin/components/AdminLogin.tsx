import { useState } from "react";
import type { FormEvent } from "react";
import Button from "../../components/Button";
import { loginAdmin } from "../api";
import styles from "./AdminLogin.module.css";

const TEST_EMAIL = "admin@example.com";
const TEST_PASSWORD = "testPass123";

type AdminLoginProps = {
  onSuccess: (email: string) => void;
};

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState(TEST_EMAIL);
  const [password, setPassword] = useState(TEST_PASSWORD);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await loginAdmin(email, password);

    if (!result.ok) {
      setError(result.error ?? "Ungültige Zugangsdaten.");
      setLoading(false);
      return;
    }

    onSuccess(email.trim().toLowerCase());
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <span className={styles.brand}>Stadtlöwe</span>
        <h1 className={styles.title}>Admin Login</h1>
        <p className={styles.text}>Interner Bereich – nur für Administratoren.</p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="admin-email">
            E-Mail
          </label>
          <input
            id="admin-email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="admin-password">
            Passwort
          </label>
          <input
            id="admin-password"
            type="password"
            className={styles.input}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Anmelden …" : "Anmelden"}
        </Button>

        <p className={styles.hint}>
          Test-Zugang: <strong>{TEST_EMAIL}</strong> /{" "}
          <strong>{TEST_PASSWORD}</strong>
        </p>
      </form>
    </div>
  );
}
