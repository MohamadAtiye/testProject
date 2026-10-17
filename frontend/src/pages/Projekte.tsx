import Page from "../components/Page";
import { projects } from "../data/projects";

export default function Projekte() {
  return (
    <Page eyebrow="Portfolio" title="Ausgewählte Projekte">
      {projects.map((project) => (
        <p key={project.name}>
          <strong>{project.name}</strong> — {project.category}
        </p>
      ))}
    </Page>
  );
}
