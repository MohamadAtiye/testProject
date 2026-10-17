import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { fetchSession, logoutAdmin } from "../api";
import Button from "../../components/Button";
import AdminLogin from "../components/AdminLogin";
import AdminDashboard from "../components/AdminDashboard";
import AdminRecords from "./AdminRecords";
import styles from "./Admin.module.css";

type State = "loading" | "anon" | "authed";

export default function Admin() {
  const { pathname } = useLocation();
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetchSession().then((session) => {
      if (session) {
        setEmail(session);
        setState("authed");
      } else {
        setState("anon");
      }
    });
  }, []);

  async function handleLogout() {
    await logoutAdmin();
    setEmail("");
    setState("anon");
  }

  if (state === "loading") {
    return (
      <div className={styles.wrap}>
        <p className={styles.loading}>Laden …</p>
      </div>
    );
  }

  if (state === "anon") {
    return (
      <AdminLogin
        onSuccess={(value) => {
          setEmail(value);
          setState("authed");
        }}
      />
    );
  }

  const section = pathname.replace(/^\/admin\/?/, "").replace(/\/$/, "");

  let view;
  if (section === "messages") {
    view = <AdminRecords key="contact" type="contact" onLogout={handleLogout} />;
  } else if (section === "projects") {
    view = <AdminRecords key="project" type="project" onLogout={handleLogout} />;
  } else {
    view = <AdminDashboard email={email} onLogout={handleLogout} />;
  }

  return (
    <div className={styles.panel}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link to="/admin" className={styles.brand}>
            Stadtlöwe Admin
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Abmelden
          </Button>
        </div>
      </header>

      <div className={styles.content}>{view}</div>
    </div>
  );
}
