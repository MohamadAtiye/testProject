import { useState } from "react";
import type { FormEvent } from "react";
import Container from "../components/Container";
import Button from "../components/Button";
import Icon from "../components/Icon";
import { contact, offices } from "../data/contact";
import styles from "./Kontakt.module.css";

export default function Kontakt() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
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
          {sent ? (
            <p className={styles.success} role="status">
              Vielen Dank! Deine Nachricht wurde übermittelt. Wir melden uns in
              Kürze bei dir.
            </p>
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
                  className={styles.input}
                  placeholder="name@beispiel.de"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="phone">
                  Telefonnummer
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className={styles.input}
                  placeholder="+49 000 000 000"
                />
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
                  className={styles.input}
                  placeholder="Worum geht es?"
                />
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
                  className={styles.textarea}
                  placeholder="Deine Nachricht an uns …"
                />
              </div>

              <Button type="submit" variant="primary" withArrow>
                Nachricht senden
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
              <a
                className={styles.cardRow}
                href={`mailto:${contact.email}`}
              >
                <Icon name="mail" size={20} className={styles.cardIcon} />
                <span>{contact.email}</span>
              </a>
              <a
                className={styles.cardRow}
                href={`tel:${contact.phoneHref}`}
              >
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
