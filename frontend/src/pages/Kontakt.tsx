import { useState } from "react";
import type { FormEvent } from "react";
import Container from "../components/Container";
import Button from "../components/Button";
import Icon from "../components/Icon";
import { contact, offices } from "../data/contact";
import styles from "./Kontakt.module.css";

type Status = "idle" | "loading" | "success" | "error";

export default function Kontakt() {
  const [status, setStatus] = useState<Status>("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const payload = {
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      title: String(data.get("title") ?? ""),
      message: String(data.get("message") ?? ""),
    };

    setStatus("loading");
    setFieldErrors({});
    setFormError("");

    try {
      const response = await fetch("/api/contact.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; errors?: Record<string, string> }
        | null;

      if (!response.ok || !result?.ok) {
        setFieldErrors(result?.errors ?? {});
        setFormError(
          result?.error ?? "Senden fehlgeschlagen. Bitte versuche es erneut.",
        );
        setStatus("error");
        return;
      }

      form.reset();
      setStatus("success");
    } catch {
      setFormError("Netzwerkfehler. Bitte versuche es später erneut.");
      setStatus("error");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerBand}>
        <Container className={styles.headerInner}>
          <header className={styles.header}>
            <span className={styles.eyebrow}>Kontakt</span>
            <h1 className={styles.title}>Kontakt aufnehmen</h1>
            <p className={styles.lead}>
              Erzähl uns von deinem Vorhaben. Nutze das Formular oder schreib
              uns direkt eine E-Mail – wir melden uns zeitnah mit einem ersten
              Lösungsansatz.
            </p>
          </header>
        </Container>
      </div>

      <div className={styles.formBand}>
        <Container className={styles.formInner}>
          {status === "success" ? (
            <div className={styles.successBlock}>
              <p className={styles.success} role="status">
                Vielen Dank! Deine Nachricht wurde übermittelt. Wir melden uns
                in Kürze bei dir.
              </p>
              <div className={styles.successActions}>
                <Button to="/projekte" variant="primary" withArrow>
                  Unsere Projekte ansehen
                </Button>
                <Button variant="ghost" onClick={() => setStatus("idle")}>
                  Noch eine Nachricht senden
                </Button>
              </div>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                  E-Mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={[
                    styles.input,
                    fieldErrors.email ? styles.inputError : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  placeholder="name@beispiel.de"
                />
                {fieldErrors.email && (
                  <span className={styles.fieldError}>{fieldErrors.email}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="phone">
                  Telefonnummer
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className={[
                    styles.input,
                    fieldErrors.phone ? styles.inputError : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  placeholder="+49 000 000 000"
                />
                {fieldErrors.phone && (
                  <span className={styles.fieldError}>{fieldErrors.phone}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="title">
                  Titel
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  className={[
                    styles.input,
                    fieldErrors.title ? styles.inputError : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  placeholder="Worum geht es?"
                />
                {fieldErrors.title && (
                  <span className={styles.fieldError}>{fieldErrors.title}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="message">
                  Nachricht
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  required
                  className={[
                    styles.textarea,
                    fieldErrors.message ? styles.inputError : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  placeholder="Deine Nachricht an uns …"
                />
                {fieldErrors.message && (
                  <span className={styles.fieldError}>
                    {fieldErrors.message}
                  </span>
                )}
              </div>

              {formError && (
                <p className={styles.formError} role="alert">
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                withArrow
                disabled={status === "loading"}
              >
                {status === "loading" ? "Wird gesendet …" : "Nachricht senden"}
              </Button>
            </form>
          )}
        </Container>
      </div>

      <section className={styles.infoBand} aria-labelledby="info-title">
        <Container>
          <h2 id="info-title" className={styles.infoHeading}>
            Direkter Kontakt &amp; Standorte
          </h2>

          <div className={styles.cardGrid}>
            <div className={styles.card}>
              <span className={styles.cardKicker}>Kontakt</span>
              <a className={styles.cardRow} href={`mailto:${contact.email}`}>
                <Icon name="mail" size={20} className={styles.cardIcon} />
                <span>{contact.email}</span>
              </a>
              <a className={styles.cardRow} href={`tel:${contact.phoneHref}`}>
                <Icon name="phone" size={20} className={styles.cardIcon} />
                <span>{contact.phone}</span>
              </a>
            </div>

            {offices.map((office) => (
              <div key={office.city} className={styles.card}>
                <span className={styles.cardHead}>
                  <span className={styles.cardKicker}>{office.city}</span>
                  {office.primary && (
                    <span className={styles.badge}>Hauptsitz</span>
                  )}
                </span>
                <div className={styles.cardRow}>
                  <Icon name="mapPin" size={20} className={styles.cardIcon} />
                  <span>
                    {office.street}
                    <br />
                    {office.zip}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
