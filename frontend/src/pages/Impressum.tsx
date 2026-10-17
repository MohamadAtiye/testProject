import Page from "../components/Page";
import { contact } from "../data/contact";

export default function Impressum() {
  return (
    <Page eyebrow="Rechtliches" title="Impressum">
      <p>Angaben gemäß § 5 DDG.</p>
      <p>
        Stadtlöwe — Design · Systems · Consulting
        <br />
        {contact.addressLine}
      </p>
      <p>
        E-Mail: <a href={`mailto:${contact.email}`}>{contact.email}</a>
      </p>
    </Page>
  );
}
