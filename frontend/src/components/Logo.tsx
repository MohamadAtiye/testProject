import logoOnDark from "/images/logo-dark.png";
import logoOnLight from "/images/logo-light.png";
import styles from "./Logo.module.css";

type LogoProps = {
  onLight?: boolean;
  className?: string;
};

export default function Logo({ onLight = false, className }: LogoProps) {
  return (
    <img
      src={onLight ? logoOnLight : logoOnDark}
      alt="Stadtlöwe — Design · Systems · Consulting"
      className={[styles.logo, className].filter(Boolean).join(" ")}
    />
  );
}
