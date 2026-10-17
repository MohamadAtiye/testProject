import type { ReactNode } from "react";
import { Link } from "react-router";
import Icon from "./Icon";
import styles from "./Button.module.css";

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "ghost";
  size?: "md" | "sm" | "lg";
  withArrow?: boolean;
  to?: string;
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  withArrow = false,
  to,
  href,
  type = "button",
  disabled = false,
  className,
  onClick,
}: ButtonProps) {
  const classes = [
    styles.btn,
    styles[variant],
    size !== "md" ? styles[size] : null,
    disabled ? styles.disabled : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span>{children}</span>
      {withArrow && (
        <Icon name="arrowRight" size={18} className={styles.arrow} />
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} onClick={onClick}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {content}
    </button>
  );
}
