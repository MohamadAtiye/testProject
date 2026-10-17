import Container from "../components/Container";
import Icon from "../components/Icon";
import { services } from "../data/services";
import styles from "./ServicesStrip.module.css";

export default function ServicesStrip() {
  return (
    <section
      id="leistungen"
      className={styles.section}
      aria-labelledby="services-title"
    >
      <Container>
        <h2 id="services-title" className="visually-hidden">
          Unsere Leistungen
        </h2>
        <ul className={styles.grid}>
          {services.map((service) => (
            <li key={service.title} className={styles.item}>
              <Icon
                name={service.icon}
                size={48}
                strokeWidth={1.5}
                className={styles.icon}
              />
              <span className={styles.label}>{service.title}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
