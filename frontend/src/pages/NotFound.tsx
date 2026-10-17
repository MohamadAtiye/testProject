import { Link } from "react-router";
import Page from "../components/Page";

export default function NotFound() {
  return (
    <Page eyebrow="Fehler 404" title="Seite nicht gefunden">
      <p>Die aufgerufene Seite existiert nicht.</p>
      <p>
        <Link to="/">Zurück zur Startseite</Link>
      </p>
    </Page>
  );
}
