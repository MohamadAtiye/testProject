import type { ReactNode } from "react";
import { Link } from "react-router";
import Icon from "./Icon";
import styles from "./ArrowLink.module.css";

type ArrowLinkProps = {
  to: string;
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
};

export default function ArrowLink({
  to,
  children,
  tone = "dark",
  className,
}: ArrowLinkProps) {
  return (
    <Link
      to={to}
      className={[styles.link, styles[tone], className].filter(Boolean).join(" ")}
    >
      <span>{children}</span>
      <Icon name="arrowRight" size={18} className={styles.arrow} />
    </Link>
  );
}
