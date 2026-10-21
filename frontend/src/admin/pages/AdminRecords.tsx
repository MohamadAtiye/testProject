import { useCallback, useEffect, useState } from "react";
import Button from "../../components/Button";
import { fetchRecords } from "../api";
import type {
  AdminRecord,
  ContactRecord,
  ProjectRecord,
  RecordsResult,
  RecordType,
} from "../api";
import AdminPageHeader from "../components/AdminPageHeader";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import ExpandableText from "../components/ExpandableText";
import styles from "./AdminRecords.module.css";

type AdminRecordsProps = {
  type: RecordType;
  onLogout: () => void;
};

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function formatBudget(budget: ProjectRecord["budget"]): string {
  if (!budget) {
    return "—";
  }
  if (budget.unknown) {
    return "unklar";
  }
  return budget.range || "—";
}

function formatTimeline(timeline: ProjectRecord["timeline"]): string {
  if (!timeline || !timeline.kind) {
    return "—";
  }
  if (timeline.kind === "asap") {
    return "asap";
  }
  if (timeline.kind === "fixed") {
    return timeline.date ? formatDate(timeline.date) : "Festes Datum";
  }
  return "Flexibel";
}

const labels: Record<RecordType, string> = {
  contact: "Kontaktanfragen",
  project: "Projektanfragen",
};

const contactColumns: Column<ContactRecord>[] = [
  {
    key: "createdAt",
    header: "Datum",
    className: styles.nowrap,
    render: (row) => formatDate(row.createdAt),
  },
  { key: "title", header: "Titel", className: styles.nowrap },
  {
    key: "email",
    header: "E-Mail",
    render: (row) => <a href={`mailto:${row.email}`}>{row.email}</a>,
  },
  {
    key: "phone",
    header: "Telefon",
    className: styles.nowrap,
    render: (row) => row.phone || "—",
  },
  {
    key: "message",
    header: "Nachricht",
    render: (row) => <ExpandableText text={row.message} />,
  },
];

const projectColumns: Column<ProjectRecord>[] = [
  {
    key: "createdAt",
    header: "Datum",
    className: styles.nowrap,
    render: (row) => formatDate(row.createdAt),
  },
  {
    key: "service",
    header: "Leistung",
    render: (row) => <span className={styles.badge}>{row.service}</span>,
  },
  {
    key: "engagement",
    header: "Art",
    className: styles.nowrap,
    render: (row) => (row.engagement === "longterm" ? "Langfristig" : "Projekt"),
  },
  {
    key: "contact",
    header: "Kontakt",
    render: (row) => (
      <span className={styles.contact}>
        <strong>{row.contact.name}</strong>
        {row.contact.company ? ` · ${row.contact.company}` : ""}
        <a href={`mailto:${row.contact.email}`}>{row.contact.email}</a>
      </span>
    ),
  },
  {
    key: "goal",
    header: "Vorhaben",
    render: (row) => <ExpandableText text={row.goal} />,
  },
  {
    key: "budget",
    header: "Budget",
    className: styles.nowrap,
    render: (row) => formatBudget(row.budget),
  },
  {
    key: "timeline",
    header: "Zeitrahmen",
    className: styles.nowrap,
    render: (row) => formatTimeline(row.timeline),
  },
];

export default function AdminRecords({ type, onLogout }: AdminRecordsProps) {
  const [records, setRecords] = useState<AdminRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const applyResult = useCallback(
    (result: RecordsResult) => {
      if (!result.ok) {
        if (result.status === 401) {
          onLogout();
          return;
        }
        setRecords(null);
        setError("Daten konnten nicht geladen werden.");
        setLoading(false);
        return;
      }

      setRecords(result.records);
      setError("");
      setLoading(false);
    },
    [onLogout],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await fetchRecords(type);
      if (active) {
        applyResult(result);
      }
    })();
    return () => {
      active = false;
    };
  }, [type, applyResult]);

  async function refresh() {
    setLoading(true);
    setError("");
    applyResult(await fetchRecords(type));
  }

  return (
    <div className={styles.page}>
      <AdminPageHeader
        title={labels[type]}
        subtitle={records ? `${records.length} Einträge` : "Wird geladen …"}
        showBack
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

      {loading && !records ? (
        <p className={styles.status}>Laden …</p>
      ) : error ? (
        <div className={styles.errorBox}>
          <p>{error}</p>
          <Button variant="primary" size="sm" onClick={refresh}>
            Erneut versuchen
          </Button>
        </div>
      ) : type === "contact" ? (
        <DataTable<ContactRecord>
          columns={contactColumns}
          rows={(records as ContactRecord[]) ?? []}
          rowKey={(row) => row.id}
          emptyText="Noch keine Kontaktanfragen."
        />
      ) : (
        <DataTable<ProjectRecord>
          columns={projectColumns}
          rows={(records as ProjectRecord[]) ?? []}
          rowKey={(row) => row.id}
          emptyText="Noch keine Projektanfragen."
        />
      )}
    </div>
  );
}
