import Page from "../components/Page";

export default function Impressum() {
  return (
    <Page eyebrow="Rechtliches" title="Impressum">
      <p>Angaben gemäß § 5 DDG.</p>
      <p>
        Stadtlöwe — Design · Systems · Consulting
        <br />
        Musterstraße 1
        <br />
        12345 Stadt
      </p>
      <p>
        E-Mail: <a href="mailto:hallo@stadtloewe.de">hallo@stadtloewe.de</a>
      </p>
    </Page>
  );
}
