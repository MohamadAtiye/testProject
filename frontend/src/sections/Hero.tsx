import Container from "../components/Container";
import Button from "../components/Button";
import heroImage from "/images/hero-lion-upscaled.jpg";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <img
        className={styles.image}
        src={heroImage}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
      />
      <div className={styles.overlay} aria-hidden="true" />
      <Container className={styles.inner}>
        <h1 id="hero-title" className={styles.title}>
          Starke Marken.
          <br />
          Smarte Systeme.
          <br />
          Nachhaltige Ergebnisse.
        </h1>
        <p className={styles.lead}>
          Wir verbinden kreatives Design, moderne Technologie und strategische
          Beratung zu digitalen Lösungen, die wirken.
        </p>
        <div className={styles.actions}>
          <Button to="/projekt-starten" variant="primary" size="lg" withArrow>
            Projekt starten
          </Button>
          <Button to="/#leistungen" variant="ghost" size="lg">
            Unsere Leistungen
          </Button>
        </div>
      </Container>
    </section>
  );
}
