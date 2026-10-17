import type { IconName } from "../components/Icon";

export type Value = {
  title: string;
  icon: IconName;
};

export const values: Value[] = [
  { title: "Strategie mit Substanz", icon: "diamond" },
  { title: "Technologie, die verbindet", icon: "chip" },
  { title: "Design, das wirkt", icon: "chart" },
  { title: "Partnerschaft auf Augenhöhe", icon: "people" },
];
