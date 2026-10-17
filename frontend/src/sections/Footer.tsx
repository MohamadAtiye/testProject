import { Link } from "react-router";
import Container from "../components/Container";
import Logo from "../components/Logo";
import Icon from "../components/Icon";
import { navLinks } from "../data/navigation";
import { contact } from "../data/contact";
import styles from "./Footer.module.css";

const year = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <div className={styles.brand}>
          <Logo />
          <p className={styles.tagline}>
            Design · Systems · Consulting — digitale Lösungen, die wirken.
          </p>
        </div>

        <nav className={styles.col} aria-label="Footer-Navigation">
          <h2 className={styles.colTitle}>Navigation</h2>
          <ul className={styles.list}>
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className={styles.link}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.col}>
          <h2 className={styles.colTitle}>Kontakt</h2>
          <ul className={styles.list}>
            <li>
              <a href={`mailto:${contact.email}`} className={styles.link}>
                <Icon name="mail" size={18} />
                {contact.email}
              </a>
            </li>
            <li>
              <a href={`tel:${contact.phoneHref}`} className={styles.link}>
                <Icon name="phone" size={18} />
                {contact.phone}
              </a>
            </li>
            <li className={styles.address}>
              <Icon name="mapPin" size={18} />
              {contact.addressLine}
            </li>
          </ul>
        </div>
      </Container>

      <div className={styles.bottom}>
        <Container className={styles.bottomInner}>
          <span>© {year} Stadtlöwe. Alle Rechte vorbehalten.</span>
          <ul className={styles.legal}>
            <li>
              <Link to="/impressum" className={styles.link}>
                Impressum
              </Link>
            </li>
            <li>
              <Link to="/datenschutz" className={styles.link}>
                Datenschutz
              </Link>
            </li>
          </ul>
        </Container>
      </div>
    </footer>
  );
}
