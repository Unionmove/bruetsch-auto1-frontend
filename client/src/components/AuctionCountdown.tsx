import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { computeCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  end: string | Date | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

export default function AuctionCountdown({ end, size = "md", className }: Props) {
  const [cd, setCd] = useState(() => computeCountdown(end));

  useEffect(() => {
    setCd(computeCountdown(end));
    const id = setInterval(() => setCd(computeCountdown(end)), 1000);
    return () => clearInterval(id);
  }, [end]);

  const ended = cd.ended;
  const urgent = !ended && cd.total < 6 * 3600 * 1000; // < 6h
  const warn = !ended && cd.total < 24 * 3600 * 1000; // < 24h

  const sizeText =
    size === "sm" ? "text-xs" : size === "lg" ? "text-2xl sm:text-3xl" : "text-base";
  const labelText = size === "lg" ? "text-[11px]" : "text-[10px]";

  if (ended) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-muted-foreground",
          sizeText,
          className
        )}
      >
        <Clock className="h-3.5 w-3.5" />
        Auktion beendet
      </span>
    );
  }

  if (size === "lg") {
    const Cell = ({ value, label }: { value: number; label: string }) => (
      <div className="flex flex-col items-center min-w-[3.5rem] rounded-md bg-card border border-brand-line px-3 py-2">
        <span className={cn("font-serif font-semibold tabular-nums leading-none", sizeText)}>
          {pad(value)}
        </span>
        <span className={cn("uppercase tracking-widest text-muted-foreground mt-1", labelText)}>
          {label}
        </span>
      </div>
    );
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 sm:gap-3",
          urgent ? "text-brand-red" : warn ? "text-brand-navy" : "text-foreground",
          className
        )}
      >
        <Cell value={cd.days} label="Tage" />
        <span className="text-2xl text-muted-foreground">:</span>
        <Cell value={cd.hours} label="Std" />
        <span className="text-2xl text-muted-foreground">:</span>
        <Cell value={cd.minutes} label="Min" />
        <span className="text-2xl text-muted-foreground">:</span>
        <Cell value={cd.seconds} label="Sek" />
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 tabular-nums",
        urgent
          ? "bg-red-50 text-brand-red ring-1 ring-red-100"
          : warn
            ? "bg-amber-50 text-amber-800 ring-1 ring-amber-100"
            : "bg-muted text-foreground",
        sizeText,
        className
      )}
      title={`Auktionsende: ${new Date(end!).toLocaleString("de-DE")}`}
    >
      <Clock className="h-3.5 w-3.5" />
      {cd.days > 0 && `${cd.days}T `}
      {pad(cd.hours)}:{pad(cd.minutes)}:{pad(cd.seconds)}
    </span>
  );
}
