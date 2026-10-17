import { NavLink } from "react-router";
import { navLinks } from "../data/navigation";
import Button from "./Button";
import styles from "./TopNav.module.css";

type TopNavProps = {
  isOpen: boolean;
  onNavigate: () => void;
};

export default function TopNav({ isOpen, onNavigate }: TopNavProps) {
  return (
    <nav
      id="primary-navigation"
      className={[styles.nav, isOpen ? styles.open : null]
        .filter(Boolean)
        .join(" ")}
      aria-label="Hauptnavigation"
    >
      <ul className={styles.links}>
        {navLinks.map((link) => (
          <li key={link.label}>
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                [styles.link, isActive ? styles.active : null]
                  .filter(Boolean)
                  .join(" ")
              }
              onClick={onNavigate}
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <Button
        to="/kontakt"
        variant="primary"
        size="sm"
        withArrow
        className={styles.cta}
        onClick={onNavigate}
      >
        Projekt starten
      </Button>
    </nav>
  );
}
