import { useCallback, useEffect, useState } from "react";
import Button from "../../components/Button";
import { fetchStats } from "../api";
import type { Stats, StatsResult } from "../api";
import AdminPageHeader from "./AdminPageHeader";
import StatCard from "./StatCard";
import AdminChat from "./AdminChat";
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
      <AdminPageHeader
        title="Dashboard"
        subtitle={`Angemeldet als ${email}`}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            Aktualisieren
          </Button>
        }
      />

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
          <StatCard
            title="Offene Projekte"
            icon="chart"
            bucket={stats.openProjects}
            to="/admin/projects"
          />
        </div>
      ) : null}

      <AdminChat onLogout={onLogout} />
    </div>
  );
}
