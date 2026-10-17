import Page from "../components/Page";

export default function Datenschutz() {
  return (
    <Page eyebrow="Rechtliches" title="Datenschutz">
      <p>
        Der Schutz deiner persönlichen Daten ist uns wichtig. Diese Website
        verarbeitet personenbezogene Daten ausschließlich im Rahmen der
        gesetzlichen Bestimmungen.
      </p>
      <p>
        Bei Fragen zum Datenschutz erreichst du uns unter{" "}
        <a href="mailto:hallo@stadtloewe.de">hallo@stadtloewe.de</a>.
      </p>
    </Page>
  );
}
