import type { ReactNode } from "react";
import { Link } from "react-router";
import Icon from "../../components/Icon";
import styles from "./AdminPageHeader.module.css";

type AdminPageHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  actions?: ReactNode;
};

export default function AdminPageHeader({
  title,
  subtitle,
  showBack = false,
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className={styles.head}>
      <div className={styles.titles}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.actions}>
        <div className={styles.backSlot}>
          {showBack && (
            <Link className={styles.back} to="/admin">
              <Icon name="arrowLeft" size={15} />
              Zurück zum Dashboard
            </Link>
          )}
        </div>
        {actions}
      </div>
    </header>
  );
}
