import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Button from "../../components/Button";
import styles from "./Admin.module.css";

const TEST_EMAIL = "admin@mail.com";
const TEST_PASSWORD = "testPass123";

export default function Admin() {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState(TEST_EMAIL);
  const [password, setPassword] = useState(TEST_PASSWORD);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me.php", { credentials: "same-origin" })
      .then((response) => setAuthed(response.ok))
      .catch(() => setAuthed(false))
      .finally(() => setChecked(true));
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !result?.ok) {
        setError(result?.error ?? "Ungültige Zugangsdaten.");
        return;
      }

      setAuthed(true);
    } catch {
      setError("Verbindungsfehler. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/admin/logout.php", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // ignore - we clear the UI state regardless
    }
    setPassword(TEST_PASSWORD);
    setAuthed(false);
  }

  if (!checked) {
    return (
      <div className={styles.loginWrap}>
        <p className={styles.loading}>Laden …</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className={styles.loginWrap}>
        <form className={styles.loginCard} onSubmit={handleLogin}>
          <span className={styles.brand}>Stadtlöwe</span>
          <h1 className={styles.loginTitle}>Admin Login</h1>
          <p className={styles.loginText}>
            Interner Bereich – nur für Administratoren.
          </p>

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

  return (
    <div className={styles.panel}>
      <header className={styles.topbar}>
        <span className={styles.brand}>Stadtlöwe Admin</span>
        <Button variant="ghost" size="sm" onClick={logout}>
          Abmelden
        </Button>
      </header>

      <div className={styles.content}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Angemeldet als {TEST_EMAIL}</p>

        <div className={styles.grid}>
          <div className={styles.card}>
            <span className={styles.cardKicker}>Anfragen</span>
            <span className={styles.cardValue}>—</span>
            <span className={styles.cardText}>Noch keine Daten geladen.</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardKicker}>Modell</span>
            <span className={styles.cardValue}>Lokal</span>
            <span className={styles.cardText}>llama.cpp · 127.0.0.1:8080</span>
          </div>
        </div>

        <section className={styles.empty}>
          <h2 className={styles.emptyTitle}>Anfragen</h2>
          <p className={styles.emptyText}>
            Hier erscheinen künftig die strukturierten Kontakt- und
            Projektanfragen aus der JSON-Datenbank sowie die Abfrage des lokalen
            Modells.
          </p>
        </section>
      </div>
    </div>
  );
}
