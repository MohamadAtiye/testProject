import { useEffect, useState } from "react";
import { Link } from "react-router";
import TopNav from "../components/TopNav";
import Logo from "../components/Logo";
import styles from "./Header.module.css";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeNav = () => setIsOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[styles.header, scrolled ? styles.scrolled : null]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.inner}>
        <Link
          to="/"
          className={styles.logo}
          onClick={closeNav}
          aria-label="Zur Startseite"
        >
          <Logo />
        </Link>

        <TopNav isOpen={isOpen} onNavigate={closeNav} />

        <button
          type="button"
          className={styles.toggle}
          aria-label="Navigation ein- oder ausblenden"
          aria-expanded={isOpen}
          aria-controls="primary-navigation"
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className={styles.bar} />
          <span className={styles.bar} />
        </button>
      </div>
    </header>
  );
}
