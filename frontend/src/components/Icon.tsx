import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Monitor,
  PenTool,
  Megaphone,
  Code2,
  Settings,
  Database,
  BarChart3,
  Users2,
  Gem,
  Cpu,
  Folder,
  Plus,
  Trash2,
} from "lucide-react";

const lucideIcons = {
  monitor: Monitor,
  pen: PenTool,
  megaphone: Megaphone,
  code: Code2,
  gear: Settings,
  database: Database,
  chart: BarChart3,
  people: Users2,
  diamond: Gem,
  chip: Cpu,
  folder: Folder,
  plus: Plus,
  trash: Trash2,
} satisfies Record<string, LucideIcon>;

const pathIcons = {
  arrowRight: (
    <>
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  arrowUpRight: (
    <>
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7.5l8 5.5 8-5.5" />
    </>
  ),
  phone: (
    <path d="M5 4h3.5l1.8 4.5-2.2 1.6a12.5 12.5 0 0 0 5.3 5.3l1.6-2.2L19.5 15V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z" />
  ),
  mapPin: (
    <>
      <path d="M12 21c4-4.2 7-7.8 7-11a7 7 0 1 0-14 0c0 3.2 3 6.8 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" />
      <path d="M18.5 15.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof lucideIcons | keyof typeof pathIcons;

function isLucideName(name: IconName): name is keyof typeof lucideIcons {
  return name in lucideIcons;
}

type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export default function Icon({
  name,
  size = 24,
  strokeWidth = 1.6,
  className,
}: IconProps) {
  if (isLucideName(name)) {
    const IconComponent = lucideIcons[name];
    return (
      <IconComponent
        size={size}
        strokeWidth={strokeWidth}
        className={className}
        aria-hidden="true"
        focusable="false"
      />
    );
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {pathIcons[name]}
    </svg>
  );
}
