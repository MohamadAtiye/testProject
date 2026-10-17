import Container from "../components/Container";
import Icon from "../components/Icon";
import { values } from "../data/values";
import styles from "./BrandIntro.module.css";

export default function BrandIntro() {
  return (
    <section id="marke" className={styles.section} aria-labelledby="brand-title">
      <Container className={styles.inner}>
        <div className={styles.intro}>
          <h2 id="brand-title" className={styles.title}>
            Eine Marke.
            <br />
            Viele Möglichkeiten.
          </h2>
          <span className={styles.rule} aria-hidden="true" />
          <p className={styles.text}>
            Stadtlöwe vereint Design, Technologie und Beratung zu
            ganzheitlichen digitalen Lösungen. Für starke Marken, effiziente
            Systeme und nachhaltiges Wachstum.
          </p>
        </div>

        <ul className={styles.values}>
          {values.map((value) => (
            <li key={value.title} className={styles.value}>
              <Icon name={value.icon} size={32} className={styles.icon} />
              <span className={styles.valueTitle}>{value.title}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
