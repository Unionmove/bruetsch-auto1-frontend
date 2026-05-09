export const fmtCurrency = (
  value: number | null | undefined,
  currency: string = "EUR"
) => {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
};

export const fmtCurrencyCompact = (
  value: number | null | undefined,
  currency: string = "EUR"
) => {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
};

export const fmtKm = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return "—";
  return `${new Intl.NumberFormat("de-DE").format(value)} km`;
};

export const fmtNumber = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("de-DE").format(value);
};

export const fmtDate = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const fmtDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export type Countdown = {
  total: number; // ms remaining (can be negative)
  ended: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export const computeCountdown = (target: Date | string | null | undefined): Countdown => {
  if (!target) return { total: 0, ended: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const t = typeof target === "string" ? new Date(target) : target;
  const total = t.getTime() - Date.now();
  if (total <= 0) {
    return { total, ended: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, ended: false, days, hours, minutes, seconds };
};
