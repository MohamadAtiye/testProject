import type { ReactNode } from "react";
import Container from "./Container";
import styles from "./Page.module.css";

type PageProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
};

export default function Page({ title, eyebrow, children }: PageProps) {
  return (
    <Container className={styles.page}>
      <header className={styles.header}>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <h1 className={styles.title}>{title}</h1>
      </header>
      <div className={styles.body}>{children}</div>
    </Container>
  );
}
