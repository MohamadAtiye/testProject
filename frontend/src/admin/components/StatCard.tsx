import { Link } from "react-router";
import Icon from "../../components/Icon";
import type { IconName } from "../../components/Icon";
import type { Bucket } from "../api";
import styles from "./StatCard.module.css";

type StatCardProps = {
  title: string;
  icon: IconName;
  bucket: Bucket;
  to: string;
};

export default function StatCard({ title, icon, bucket, to }: StatCardProps) {
  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <Icon name={icon} size={18} className={styles.icon} />
        <h2 className={styles.title}>{title}</h2>
      </div>

      <div className={styles.metric}>
        <span className={styles.value}>{bucket.today}</span>
        <span className={styles.label}>Heute</span>
      </div>

      <div className={styles.metric}>
        <span className={styles.valueWeek}>{bucket.week}</span>
        <span className={styles.label}>Diese Woche</span>
      </div>

      <div className={styles.foot}>Gesamt {bucket.total}</div>

      <Link className={styles.viewAll} to={to}>
        <span>Alle ansehen</span>
        <Icon name="arrowRight" size={16} className={styles.arrow} />
      </Link>
    </section>
  );
}
