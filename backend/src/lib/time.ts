export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toIso(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
