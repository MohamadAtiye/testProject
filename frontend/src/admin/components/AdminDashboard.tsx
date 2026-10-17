import { useCallback, useEffect, useState } from "react";
import Button from "../../components/Button";
import { fetchStats } from "../api";
import type { Stats, StatsResult } from "../api";
import StatCard from "./StatCard";
import styles from "./AdminDashboard.module.css";

type AdminDashboardProps = {
  email: string;
  onLogout: () => void;
};

export default function AdminDashboard({
  email,
  onLogout,
}: AdminDashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const applyResult = useCallback(
    (result: StatsResult) => {
      if (!result.ok) {
        if (result.status === 401) {
          onLogout();
          return;
        }
        setStats(null);
        setError("Daten konnten nicht geladen werden.");
        setLoading(false);
        return;
      }

      setStats(result.stats);
      setError("");
      setLoading(false);
    },
    [onLogout],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await fetchStats();
      if (active) {
        applyResult(result);
      }
    })();
    return () => {
      active = false;
    };
  }, [applyResult]);

  async function refresh() {
    setLoading(true);
    setError("");
    applyResult(await fetchStats());
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Angemeldet als {email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          Aktualisieren
        </Button>
      </div>

      {loading && !stats ? (
        <p className={styles.status}>Laden …</p>
      ) : error ? (
        <div className={styles.errorBox}>
          <p className={styles.errorText}>{error}</p>
          <Button variant="primary" size="sm" onClick={refresh}>
            Erneut versuchen
          </Button>
        </div>
      ) : stats ? (
        <div className={styles.grid}>
          <StatCard
            title="Kontaktanfragen"
            icon="mail"
            bucket={stats.contact}
            to="/admin/messages"
          />
          <StatCard
            title="Projektanfragen"
            icon="folder"
            bucket={stats.project}
            to="/admin/projects"
          />
        </div>
      ) : null}
    </div>
  );
}
