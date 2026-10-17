import { useState } from "react";
import styles from "./ExpandableText.module.css";

type ExpandableTextProps = {
  text: string;
  /** Number of lines shown while collapsed. */
  lines?: number;
  /** Below this length the text is shown in full without a toggle. */
  limit?: number;
};

export default function ExpandableText({
  text,
  lines = 2,
  limit = 90,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);

  if (text.length <= limit) {
    return <span className={styles.text}>{text}</span>;
  }

  return (
    <span className={styles.wrap}>
      <span
        className={expanded ? styles.full : styles.clamp}
        style={expanded ? undefined : { WebkitLineClamp: lines }}
        title={expanded ? undefined : text}
      >
        {text}
      </span>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
      </button>
    </span>
  );
}
