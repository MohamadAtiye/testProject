import Container from "../components/Container";
import { projects } from "../data/projects";
import styles from "./Projekte.module.css";

export default function Projekte() {
  return (
    <div className={styles.page}>
      <Container>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Portfolio</span>
          <h1 className={styles.title}>Ausgewählte Projekte</h1>
          <p className={styles.intro}>
            Marken, Websites und Systeme, die wir von der Idee bis zur Umsetzung
            begleitet haben – sorgfältig gestaltet und auf ein klares Ziel
            ausgerichtet.
          </p>
        </header>
      </Container>

      <ul className={styles.list}>
        {projects.map((project, index) => (
          <li key={project.name} className={styles.row}>
            <Container className={styles.rowInner}>
              <div className={styles.media}>
                <img
                  className={styles.image}
                  src={project.image}
                  alt={project.name}
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </div>

              <div className={styles.content}>
                <span className={styles.category}>{project.category}</span>
                <h2 className={styles.name}>{project.name}</h2>
                <p className={styles.description}>{project.description}</p>
              </div>
            </Container>
          </li>
        ))}
      </ul>
    </div>
  );
}
