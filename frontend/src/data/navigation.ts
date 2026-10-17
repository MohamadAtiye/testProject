export type NavLink = {
  label: string;
  to: string;
};

export const navLinks: NavLink[] = [
  { label: "Design", to: "/design" },
  { label: "Systems", to: "/systems" },
  { label: "Consulting", to: "/consulting" },
  { label: "Projekte", to: "/projekte" },
  { label: "Über uns", to: "/ueber-uns" },
  { label: "Kontakt", to: "/kontakt" },
];
