import pillar1 from "/images/pillar1.jpg";
import pillar2 from "/images/pillar2.jpg";
import pillar3 from "/images/pillar3.jpg";

export type Pillar = {
  id: string;
  title: string;
  text: string;
  to: string;
  image: string;
};

export const pillars: Pillar[] = [
  {
    id: "design",
    title: "Design",
    text: "Marken, die Eindruck hinterlassen. Digital. Print. Bewegt.",
    to: "/design",
    image: pillar1,
  },
  {
    id: "systems",
    title: "Systems",
    text: "Software, Automatisierung und digitale Lösungen.",
    to: "/systems",
    image: pillar2,
  },
  {
    id: "consulting",
    title: "Consulting",
    text: "Strategie, Prozesse und nachhaltiges Wachstum.",
    to: "/consulting",
    image: pillar3,
  },
];
