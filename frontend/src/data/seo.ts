export type SeoEntry = {
  title: string;
  description: string;
  noindex?: boolean;
};

export const SITE_URL = "https://stadtloewe.de";

export const seo: Record<string, SeoEntry> = {
  "/": {
    title: "Stadtlöwe — Design · Systems · Consulting",
    description:
      "Stadtlöwe verbindet kreatives Design, moderne Technologie und strategische Beratung zu digitalen Lösungen, die wirken.",
  },
  "/ueber-uns": {
    title: "Über uns — Stadtlöwe",
    description:
      "Wer wir sind und wie wir Design, Systems und Consulting zusammen denken.",
  },
  "/kontakt": {
    title: "Kontakt — Stadtlöwe",
    description:
      "Schreib uns über das Formular oder per E-Mail – wir melden uns mit einem ersten Lösungsansatz.",
  },
  "/projekt-starten": {
    title: "Projekt starten — Stadtlöwe",
    description:
      "Beschreib dein Vorhaben in wenigen Sätzen und erhalte einen ersten Lösungsansatz.",
  },
  "/projekte": {
    title: "Projekte — Stadtlöwe",
    description: "Ausgewählte Projekte aus Design, Systems und Consulting.",
  },
  "/design": {
    title: "Design — Stadtlöwe",
    description: "Marken, Print und Web. Gestaltung, die wirkt.",
  },
  "/systems": {
    title: "Systems — Stadtlöwe",
    description: "Software, Automatisierung und Schnittstellen.",
  },
  "/consulting": {
    title: "Consulting — Stadtlöwe",
    description: "Strategie, Prozesse und nachhaltiges Wachstum.",
  },
  "/impressum": {
    title: "Impressum — Stadtlöwe",
    description: "Rechtliche Angaben zu Stadtlöwe.",
  },
  "/datenschutz": {
    title: "Datenschutz — Stadtlöwe",
    description: "Informationen zum Umgang mit deinen Daten.",
  },
};

const notFound: SeoEntry = {
  title: "Seite nicht gefunden — Stadtlöwe",
  description: "",
  noindex: true,
};

/**
 * Resolve metadata for a pathname. Unknown paths and the admin area are
 * marked noindex.
 */
export function seoForPath(pathname: string): SeoEntry {
  const clean = pathname.replace(/\/+$/, "") || "/";

  if (clean === "/admin" || clean.startsWith("/admin/")) {
    return { title: "Admin — Stadtlöwe", description: "", noindex: true };
  }

  return seo[clean] ?? notFound;
}
