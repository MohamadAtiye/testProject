import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Container from "../components/Container";
import Button from "../components/Button";
import Icon from "../components/Icon";
import type { IconName } from "../components/Icon";
import { fetchAssistSuggestions } from "../api/assist";
import type { AssistDraft, AssistSuggestions } from "../api/assist";
import styles from "./ProjektStarten.module.css";

const missingLabels: Record<string, string> = {
  service: "Leistung",
  engagement: "Art der Zusammenarbeit",
  goal: "Beschreibung",
  timeline: "Zeitrahmen",
  budget: "Budget",
};

type ServiceId = "design" | "systems" | "consulting" | "mix";
type EngagementId = "project" | "longterm";
type Status = "idle" | "loading" | "success" | "error";

const services: {
  id: ServiceId;
  title: string;
  text: string;
  icon: IconName;
}[] = [
  {
    id: "design",
    title: "Design",
    text: "Marke, Print & Web – Gestaltung, die wirkt.",
    icon: "pen",
  },
  {
    id: "systems",
    title: "Systems",
    text: "Software, Automatisierung & Schnittstellen.",
    icon: "code",
  },
  {
    id: "consulting",
    title: "Consulting",
    text: "Strategie, Prozesse & Wachstum.",
    icon: "chart",
  },
  {
    id: "mix",
    title: "Kombination",
    text: "Mehrere Bereiche zusammen denken.",
    icon: "diamond",
  },
];

const engagements: { id: EngagementId; title: string; text: string }[] = [
  {
    id: "project",
    title: "Projekt",
    text: "Einmaliges Vorhaben mit klarem Ziel.",
  },
  {
    id: "longterm",
    title: "Langfristig",
    text: "Laufende Zusammenarbeit / Partnerschaft.",
  },
];

const budgetOptions = [
  { value: "<5k", label: "unter 5.000 €" },
  { value: "5-10k", label: "5.000 – 10.000 €" },
  { value: "10-25k", label: "10.000 – 25.000 €" },
  { value: "25-50k", label: "25.000 – 50.000 €" },
  { value: ">50k", label: "über 50.000 €" },
  { value: "unknown", label: "Noch unklar" },
];

export default function ProjektStarten() {
  const [service, setService] = useState<ServiceId | "">("");
  const [engagement, setEngagement] = useState<EngagementId | "">("");
  const [goal, setGoal] = useState("");
  const [timelineKind, setTimelineKind] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [assist, setAssist] = useState<AssistSuggestions | null>(null);
  const [assistLoading, setAssistLoading] = useState(false);

  useEffect(() => {
    const draft: AssistDraft = {};
    if (service) {
      draft.service = service;
    }
    if (engagement) {
      draft.engagement = engagement;
    }
    if (goal.trim() !== "") {
      draft.goal = goal;
    }
    if (timelineKind) {
      draft.timeline = { kind: timelineKind };
    }
    if (budgetRange) {
      draft.budget = {
        range: budgetRange === "unknown" ? "" : budgetRange,
        unknown: budgetRange === "unknown",
      };
    }

    const hasInput = service !== "" || goal.trim().length >= 15;
    const inactive = !hasInput || status === "loading" || status === "success";

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      if (controller.signal.aborted) {
        return;
      }

      if (inactive) {
        setAssist(null);
        setAssistLoading(false);
        return;
      }

      setAssistLoading(true);
      const result = await fetchAssistSuggestions(draft, controller.signal);
      if (controller.signal.aborted) {
        return;
      }

      setAssist(
        result.ok
          ? {
              summary: result.summary,
              suggestions: result.suggestions,
              missing: result.missing,
            }
          : null,
      );
      setAssistLoading(false);
    }, 900);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [service, engagement, goal, timelineKind, budgetRange, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setFieldErrors({});
    setFormError("");

    const nextErrors: Record<string, string> = {};
    if (!service) {
      nextErrors.service = "Bitte wähle eine Leistung.";
    }
    if (!engagement) {
      nextErrors.engagement = "Bitte wähle die Art der Zusammenarbeit.";
    }
    if (timelineKind === "fixed" && !String(data.get("timelineDate") ?? "")) {
      nextErrors["timeline.date"] = "Bitte gib ein Datum an.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError("Bitte prüfe deine Eingaben.");
      return;
    }

    const timeline =
      timelineKind === ""
        ? undefined
        : {
            kind: timelineKind,
            date:
              timelineKind === "fixed"
                ? String(data.get("timelineDate") ?? "")
                : "",
          };

    const budget =
      budgetRange === ""
        ? undefined
        : {
            range: budgetRange === "unknown" ? "" : budgetRange,
            unknown: budgetRange === "unknown",
          };

    const payload = {
      service,
      engagement,
      goal: String(data.get("goal") ?? ""),
      timeline,
      budget,
      contact: {
        name: String(data.get("name") ?? ""),
        company: String(data.get("company") ?? ""),
        email: String(data.get("email") ?? ""),
        phone: String(data.get("phone") ?? ""),
      },
      consent: data.get("consent") === "on",
    };

    setStatus("loading");
    try {
      const response = await fetch("/api/project/submit.php", {
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
      setService("");
      setEngagement("");
      setGoal("");
      setTimelineKind("");
      setBudgetRange("");
      setAssist(null);
      setAssistLoading(false);
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
            <span className={styles.eyebrow}>Projekt</span>
            <h1 className={styles.title}>Projekt starten</h1>
            <p className={styles.lead}>
              Wähle kurz aus, worum es geht, und beschreibe dein Vorhaben in
              eigenen Worten. Wir melden uns mit einem ersten Lösungsansatz.
            </p>
          </header>
        </Container>
      </div>

      <div className={styles.formBand}>
        <Container className={styles.formInner}>
          {status === "success" ? (
            <div className={styles.successBlock}>
              <p className={styles.success} role="status">
                Danke! Deine Anfrage ist bei uns eingegangen. Wir prüfen sie und
                melden uns in Kürze bei dir.
              </p>
              <div className={styles.successActions}>
                <Button to="/projekte" variant="primary" withArrow>
                  Unsere Projekte ansehen
                </Button>
                <Button variant="ghost" onClick={() => setStatus("idle")}>
                  Noch eine Anfrage senden
                </Button>
              </div>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <fieldset className={styles.section}>
                <legend className={styles.sectionTitle}>
                  Worum geht es?
                </legend>
                <p className={styles.sectionHint}>
                  Wähle den Bereich, der am besten passt.
                </p>
                <div className={styles.cards}>
                  {services.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={[
                        styles.card,
                        service === item.id ? styles.cardActive : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-pressed={service === item.id}
                      onClick={() => setService(item.id)}
                    >
                      <Icon
                        name={item.icon}
                        size={26}
                        className={styles.cardIcon}
                      />
                      <span className={styles.cardTitle}>{item.title}</span>
                      <span className={styles.cardText}>{item.text}</span>
                    </button>
                  ))}
                </div>
                {fieldErrors.service && (
                  <p className={styles.fieldError}>{fieldErrors.service}</p>
                )}
              </fieldset>

              <fieldset className={styles.section}>
                <legend className={styles.sectionTitle}>
                  Art der Zusammenarbeit
                </legend>
                <div className={styles.segmented}>
                  {engagements.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={[
                        styles.segment,
                        engagement === item.id ? styles.segmentActive : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-pressed={engagement === item.id}
                      onClick={() => setEngagement(item.id)}
                    >
                      <span className={styles.segmentTitle}>{item.title}</span>
                      <span className={styles.segmentText}>{item.text}</span>
                    </button>
                  ))}
                </div>
                {fieldErrors.engagement && (
                  <p className={styles.fieldError}>{fieldErrors.engagement}</p>
                )}
              </fieldset>

              <div className={styles.section}>
                <label className={styles.sectionTitle} htmlFor="goal">
                  Beschreib dein Vorhaben
                </label>
                <p className={styles.sectionHint}>
                  Am hilfreichsten sind: Ausgangslage, Ziel und was dir wichtig
                  ist.
                </p>
                <textarea
                  id="goal"
                  name="goal"
                  rows={7}
                  required
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  className={[
                    styles.textarea,
                    fieldErrors.goal ? styles.inputError : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  placeholder="z. B. Wir sind ein Handwerksbetrieb und brauchen eine neue Website, über die Kunden einfach Termine anfragen können …"
                />
                {fieldErrors.goal ? (
                  <p className={styles.fieldError}>{fieldErrors.goal}</p>
                ) : (
                  <p className={styles.hint}>
                    Ein paar Sätze reichen – Details klären wir im Gespräch.
                  </p>
                )}
              </div>

              {(assistLoading || assist) && (
                <aside className={styles.assist} aria-live="polite">
                  <div className={styles.assistHead}>
                    <span className={styles.assistTitle}>
                      <Icon
                        name="sparkles"
                        size={18}
                        className={styles.assistIcon}
                      />
                      Assistent
                    </span>
                    {assistLoading && (
                      <span className={styles.assistLoading}>
                        Vorschläge werden erstellt …
                      </span>
                    )}
                  </div>

                  {assist?.summary && (
                    <p className={styles.assistSummary}>{assist.summary}</p>
                  )}

                  {assist && assist.suggestions.length > 0 && (
                    <ul className={styles.assistList}>
                      {assist.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  )}

                  {assist && assist.missing.length > 0 && (
                    <div className={styles.assistMissing}>
                      <span className={styles.assistMissingLabel}>
                        Noch offen:
                      </span>
                      {assist.missing.map((field) => (
                        <span key={field} className={styles.assistChip}>
                          {missingLabels[field] ?? field}
                        </span>
                      ))}
                    </div>
                  )}
                </aside>
              )}

              <details className={styles.optional}>
                <summary className={styles.summary}>
                  Optional: Zeitrahmen &amp; Budget angeben
                </summary>
                <div className={styles.optionalBody}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="timelineKind">
                      Zeitrahmen
                    </label>
                    <select
                      id="timelineKind"
                      className={styles.input}
                      value={timelineKind}
                      onChange={(event) => setTimelineKind(event.target.value)}
                    >
                      <option value="">Keine Angabe</option>
                      <option value="asap">So schnell wie möglich</option>
                      <option value="fixed">Festes Datum</option>
                      <option value="flexible">Flexibel</option>
                    </select>
                    {fieldErrors["timeline.date"] && (
                      <p className={styles.fieldError}>
                        {fieldErrors["timeline.date"]}
                      </p>
                    )}
                  </div>

                  {timelineKind === "fixed" && (
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="timelineDate">
                        Zieldatum
                      </label>
                      <input
                        id="timelineDate"
                        name="timelineDate"
                        type="date"
                        className={styles.input}
                      />
                    </div>
                  )}

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="budgetRange">
                      Budget
                    </label>
                    <select
                      id="budgetRange"
                      className={styles.input}
                      value={budgetRange}
                      onChange={(event) => setBudgetRange(event.target.value)}
                    >
                      <option value="">Keine Angabe</option>
                      {budgetOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </details>

              <fieldset className={styles.section}>
                <legend className={styles.sectionTitle}>Kontakt</legend>
                <div className={styles.contactGrid}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="name">
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      className={[
                        styles.input,
                        fieldErrors["contact.name"] ? styles.inputError : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                    {fieldErrors["contact.name"] && (
                      <p className={styles.fieldError}>
                        {fieldErrors["contact.name"]}
                      </p>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="company">
                      Firma{" "}
                      <span className={styles.optionalTag}>optional</span>
                    </label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      className={styles.input}
                    />
                  </div>

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
                        fieldErrors["contact.email"] ? styles.inputError : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                    {fieldErrors["contact.email"] && (
                      <p className={styles.fieldError}>
                        {fieldErrors["contact.email"]}
                      </p>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="phone">
                      Telefon{" "}
                      <span className={styles.optionalTag}>optional</span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className={[
                        styles.input,
                        fieldErrors["contact.phone"] ? styles.inputError : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                    {fieldErrors["contact.phone"] && (
                      <p className={styles.fieldError}>
                        {fieldErrors["contact.phone"]}
                      </p>
                    )}
                  </div>
                </div>
              </fieldset>

              <label className={styles.consent}>
                <input
                  type="checkbox"
                  name="consent"
                  required
                  className={styles.checkbox}
                />
                <span>
                  Ich stimme zu, dass meine Angaben zur Bearbeitung meiner
                  Anfrage gespeichert und verarbeitet werden.
                </span>
              </label>
              {fieldErrors.consent && (
                <p className={styles.fieldError}>{fieldErrors.consent}</p>
              )}

              {formError && (
                <p className={styles.formError} role="alert">
                  {formError}
                </p>
              )}

              <div className={styles.actions}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  withArrow
                  disabled={status === "loading"}
                >
                  {status === "loading" ? "Wird gesendet …" : "Anfrage senden"}
                </Button>
              </div>
            </form>
          )}
        </Container>
      </div>
    </div>
  );
}
