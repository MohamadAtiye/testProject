# Kontext

## Über Stadtlöwe

Stadtlöwe ist eine Agentur für:

- **Design** – Marken, Print und Web. Gestaltung, die wirkt.
- **Systems** – Software, Automatisierung und Schnittstellen.
- **Consulting** – Strategie, Prozesse und nachhaltiges Wachstum.

## Datenquellen (Backend)

Das Backend speichert eingehende Anfragen in MySQL. Es gibt zwei Arten:

### Kontaktanfragen (`contacts`)

Allgemeine Kontaktnachrichten über das Kontaktformular. Felder:

- `email`, `phone` – Kontaktdaten
- `title` – Betreff
- `message` – Freitext der Anfrage
- `createdAt` – Zeitpunkt (ISO 8601)

### Projektanfragen (`projects`)

Strukturierte Anfragen über "Projekt starten". Felder:

- `service` – `design` | `systems` | `consulting` | `mix`
- `engagement` – `project` (einmalig) | `longterm` (laufende Zusammenarbeit)
- `goal` – Freitext: das beschriebene Vorhaben
- `timeline` – `{ kind: fixed | flexible | asap, date }` (optional)
- `budget` – `{ range, unknown }` (optional)
- `contact` – `{ name, company, email, phone }`
- `consent` – Einwilligung zur Verarbeitung
- `status` – Bearbeitungsstand (z. B. `new`)
- `createdAt` – Zeitpunkt (ISO 8601)

## Wie Anfragen zu lesen sind

- Ordne `service` den passenden Leistungsbereichen zu (Design / Systems / Consulting / Kombination).
- `engagement = longterm` → laufende Zusammenarbeit; `project` → einmaliges Vorhaben mit klarem Ziel.
- `budget.unknown = true` → Budget noch unklar – nicht als "kein Budget" interpretieren.
- Fehlende optionale Felder (`timeline`, `budget`) bedeuten "keine Angabe", nicht "nicht gewünscht".
- Zitierte Freitexte (`goal`, `message`) wörtlich behandeln, nicht umdeuten.
