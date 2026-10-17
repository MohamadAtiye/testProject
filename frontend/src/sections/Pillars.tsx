import { Link } from "react-router";
import Container from "../components/Container";
import Icon from "../components/Icon";
import { pillars } from "../data/pillars";
import styles from "./Pillars.module.css";

export default function Pillars() {
  return (
    <section className={styles.section} aria-label="Unsere Kompetenzen">
      <Container>
        <div className={styles.grid}>
          {pillars.map((pillar) => (
            <Link
              key={pillar.id}
              id={pillar.id}
              to={pillar.to}
              className={styles.card}
            >
              <img
                className={styles.media}
                src={pillar.image}
                alt=""
                aria-hidden="true"
                loading="lazy"
              />
              <div className={styles.body}>
                <h3 className={styles.title}>{pillar.title}</h3>
                <div className={styles.row}>
                  <p className={styles.text}>{pillar.text}</p>
                  <span
                    className={styles.more}
                    aria-hidden="true"
                  >
                    <Icon name="arrowRight" size={22} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
