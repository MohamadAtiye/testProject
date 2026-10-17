import type { IconName } from "../components/Icon";

export type Service = {
  title: string;
  icon: IconName;
};

export const services: Service[] = [
  { title: "Webdesign & Entwicklung", icon: "monitor" },
  { title: "Grafikdesign & Markenentwicklung", icon: "pen" },
  { title: "Marketing & Kommunikation", icon: "megaphone" },
  { title: "Software & Systementwicklung", icon: "code" },
  { title: "Automatisierung & Schnittstellen", icon: "gear" },
  { title: "IT-Beratung & Digitalisierung", icon: "database" },
  { title: "Management & Prozessoptimierung", icon: "chart" },
  { title: "Consulting & Strategie", icon: "people" },
];
