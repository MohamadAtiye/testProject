import { useState } from "react";
import Container from "../components/Container";
import Button from "../components/Button";
import Icon from "../components/Icon";
import { contact, offices } from "../data/contact";
import styles from "./UeberUns.module.css";

type Member = {
  name: string;
  role: string;
  avatar: string;
};

const team: Member[] = [
  {
    name: "Lena Hoffmann",
    role: "Kreativdirektorin",
    avatar: "https://i.pravatar.cc/320?img=45",
  },
  {
    name: "Marco Berger",
    role: "Head of Systems",
    avatar: "https://i.pravatar.cc/320?img=12",
  },
  {
    name: "Sofia Wagner",
    role: "Strategieberaterin",
    avatar: "https://i.pravatar.cc/320?img=32",
  },
  {
    name: "Jonas Keller",
    role: "Lead Developer",
    avatar: "https://i.pravatar.cc/320?img=15",
  },
];

const stats = [
  { value: "2014", label: "Gegründet" },
  { value: "150+", label: "Projekte" },
  { value: "3", label: "Disziplinen" },
];

export default function UeberUns() {
  const [activeOffice, setActiveOffice] = useState(0);
  const office = offices[activeOffice];

  return (
    <div className={styles.page}>
      <Container>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Über uns</span>
          <h1 className={styles.title}>Eine Marke. Viele Möglichkeiten.</h1>
          <p className={styles.lead}>
            Stadtlöwe vereint Design, Technologie und Beratung zu ganzheitlichen
            digitalen Lösungen. Wir begleiten Unternehmen von der Strategie über
            das Design bis zur technischen Umsetzung – für starke Marken,
            effiziente Systeme und nachhaltiges Wachstum.
          </p>
        </header>

        <ul className={styles.stats}>
          {stats.map((stat) => (
            <li key={stat.label} className={styles.stat}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </li>
          ))}
        </ul>
      </Container>

      <section
        className={`${styles.section} ${styles.light}`}
        aria-labelledby="team-title"
      >
        <Container>
          <div className={styles.sectionHead}>
            <h2 id="team-title" className={styles.sectionTitle}>
              Das Team
            </h2>
            <p className={styles.sectionText}>
              Die Menschen hinter Stadtlöwe – neugierig, detailverliebt und
              immer auf der Suche nach der besten Lösung.
            </p>
          </div>

          <ul className={styles.teamGrid}>
            {team.map((member) => (
              <li key={member.name} className={styles.member}>
                <div className={styles.avatarWrap}>
                  <img
                    className={styles.avatar}
                    src={member.avatar}
                    alt={member.name}
                    loading="lazy"
                  />
                </div>
                <h3 className={styles.memberName}>{member.name}</h3>
                <span className={styles.memberRole}>{member.role}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className={styles.section} aria-labelledby="contact-title">
        <Container className={styles.contact}>
          <div className={styles.contactInfo}>
            <h2 id="contact-title" className={styles.sectionTitle}>
              Kontakt &amp; Anfahrt
            </h2>
            <p className={styles.sectionText}>
              Drei Standorte, ein Team. Wähle einen Standort für die Anfahrt
              oder schreib uns direkt – wir freuen uns auf dich.
            </p>

            <ul className={styles.contactList}>
              {offices.map((item, index) => (
                <li key={item.city}>
                  <button
                    type="button"
                    className={[
                      styles.office,
                      index === activeOffice ? styles.officeActive : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setActiveOffice(index)}
                    aria-pressed={index === activeOffice}
                  >
                    <Icon
                      name="mapPin"
                      size={20}
                      className={styles.contactIcon}
                    />
                    <span className={styles.officeBody}>
                      <span className={styles.officeHead}>
                        <span className={styles.contactLabel}>
                          {item.city}
                        </span>
                        {item.primary && (
                          <span className={styles.badge}>Hauptsitz</span>
                        )}
                      </span>
                      <span className={styles.contactValue}>
                        {item.street}
                        <br />
                        {item.zip}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              <li className={styles.contactItem}>
                <Icon name="mail" size={20} className={styles.contactIcon} />
                <div>
                  <span className={styles.contactLabel}>E-Mail</span>
                  <a
                    className={styles.contactValue}
                    href={`mailto:${contact.email}`}
                  >
                    {contact.email}
                  </a>
                </div>
              </li>
              <li className={styles.contactItem}>
                <Icon name="phone" size={20} className={styles.contactIcon} />
                <div>
                  <span className={styles.contactLabel}>Telefon</span>
                  <a
                    className={styles.contactValue}
                    href={`tel:${contact.phoneHref}`}
                  >
                    {contact.phone}
                  </a>
                </div>
              </li>
            </ul>

            <div className={styles.actions}>
              <Button to="/projekt-starten" variant="primary" withArrow>
                Projekt starten
              </Button>
              <Button to="/kontakt" variant="ghost">
                Kontakt aufnehmen
              </Button>
            </div>
          </div>

          <div className={styles.map}>
            <iframe
              title={`Standort ${office.city}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                `${office.street}, ${office.zip}`,
              )}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </Container>
      </section>
    </div>
  );
}
