import styles from "./ErrorFallback.module.css";

type ErrorFallbackProps = {
  error: unknown;
  resetErrorBoundary: (...args: unknown[]) => void;
};

export default function ErrorFallback({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps) {
  const message =
    error instanceof Error ? error.message : "Unbekannter Fehler";

  return (
    <div className={styles.wrapper} role="alert">
      <div className={styles.card}>
        <h1 className={styles.title}>Etwas ist schiefgelaufen.</h1>
        <p className={styles.text}>{message}</p>
        <button
          type="button"
          className={styles.button}
          onClick={resetErrorBoundary}
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
