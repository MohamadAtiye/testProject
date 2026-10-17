import Container from "../components/Container";
import ArrowLink from "../components/ArrowLink";
import { projects } from "../data/projects";
import styles from "./Projects.module.css";

export default function Projects() {
  return (
    <section
      id="projekte"
      className={styles.section}
      aria-labelledby="projects-title"
    >
      <Container>
        <div className={styles.head}>
          <h2 id="projects-title" className={styles.title}>
            Ausgewählte Projekte
          </h2>
          <ArrowLink to="/projekte" tone="dark">
            Alle Projekte ansehen
          </ArrowLink>
        </div>

        <ul className={styles.grid}>
          {projects.map((project) => (
            <li key={project.name} className={styles.card}>
              <div className={styles.media}>
                <img
                  className={styles.image}
                  src={project.image}
                  alt={project.name}
                  loading="lazy"
                />
              </div>
              <div className={styles.meta}>
                <h3 className={styles.name}>{project.name}</h3>
                <span className={styles.category}>{project.category}</span>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
