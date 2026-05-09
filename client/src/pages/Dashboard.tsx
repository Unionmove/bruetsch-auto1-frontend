import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtCurrency, fmtCurrencyCompact } from "@/lib/format";
import {
  Car,
  Gavel,
  TrendingDown,
  TrendingUp,
  Banknote,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import AuctionCountdown from "@/components/AuctionCountdown";
import { Badge } from "@/components/ui/badge";

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: typeof Car;
}) {
  return (
    <Card className="p-5 border-brand-line">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 font-serif text-2xl sm:text-3xl font-semibold text-brand-navy tabular-nums">
            {value}
          </div>
          {hint && (
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          )}
        </div>
        <div className="h-10 w-10 rounded-md bg-secondary text-brand-navy flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError } = trpc.auto1.dashboard.useQuery();

  if (isError) {
    return (
      <div className="container py-16 text-center">
        <div className="font-serif text-xl text-brand-navy">Daten konnten nicht geladen werden</div>
        <p className="mt-2 text-sm text-muted-foreground">Bitte Seite neu laden oder API-Verbindung prüfen.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 sm:py-10 space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Übersicht
          </div>
          <h1 className="mt-1 font-serif text-3xl sm:text-4xl font-semibold text-brand-navy">
            Auktions-Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Aktueller Stand der vom AUTO1 Import-Agenten beobachteten Fahrzeuge:
            Bestand, Preisspanne und laufende Auktionen.
          </p>
        </div>
        <Link
          href="/fahrzeuge"
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navy-soft transition-colors"
        >
          Alle Fahrzeuge ansehen
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading || !data ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))
        ) : (
          <>
            <KpiCard
              label="Fahrzeuge"
              value={data.vehicleCount}
              hint={`${data.brands.length} Marken`}
              icon={Car}
            />
            <KpiCard
              label="Laufende Auktionen"
              value={data.liveAuctions}
              hint={data.endedAuctions ? `${data.endedAuctions} beendet` : "—"}
              icon={Gavel}
            />
            <KpiCard
              label="Ø Gesamtkosten"
              value={fmtCurrencyCompact(data.avgPrice)}
              hint="inkl. Service-Gebühr"
              icon={Banknote}
            />
            <KpiCard
              label="Günstigstes"
              value={fmtCurrencyCompact(data.minPrice)}
              hint={
                data.cheapest
                  ? `${data.cheapest.brand} ${data.cheapest.model}`
                  : undefined
              }
              icon={TrendingDown}
            />
            <KpiCard
              label="Teuerstes"
              value={fmtCurrencyCompact(data.maxPrice)}
              hint={
                data.mostExpensive
                  ? `${data.mostExpensive.brand} ${data.mostExpensive.model}`
                  : undefined
              }
              icon={TrendingUp}
            />
          </>
        )}
      </section>

      {/* Brand distribution + ending soon */}
      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 border-brand-line lg:col-span-1">
          <h2 className="font-serif text-lg font-semibold text-brand-navy">
            Marken im Bestand
          </h2>
          <div className="mt-4 space-y-3">
            {isLoading || !data
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))
              : data.brands.map((b) => {
                  const pct =
                    data.vehicleCount > 0
                      ? Math.round((b.count / data.vehicleCount) * 100)
                      : 0;
                  return (
                    <div key={b.brand} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{b.brand}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {b.count} · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-brand-navy"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
          </div>
        </Card>

        <Card className="p-5 border-brand-line lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-brand-navy">
              Bald endende Auktionen
            </h2>
            <Badge variant="secondary" className="bg-secondary text-brand-navy">
              Live
            </Badge>
          </div>
          <div className="mt-4 divide-y divide-brand-line">
            {isLoading || !data ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="py-3">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))
            ) : data.endingSoon.length === 0 ? (
              <div className="py-6 text-sm text-muted-foreground text-center">
                Aktuell laufen keine Auktionen.
              </div>
            ) : (
              data.endingSoon.map((v) => (
                <Link
                  key={v.stock_nr}
                  href={`/fahrzeuge/${encodeURIComponent(v.stock_nr)}`}
                  className="flex items-center gap-3 py-3 group"
                >
                  <div className="h-12 w-16 rounded bg-muted overflow-hidden flex-shrink-0">
                    {v.cover_photo && (
                      <img
                        src={v.cover_photo}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-brand-navy group-hover:underline truncate">
                      {v.brand} {v.model}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {v.stock_nr} · {fmtCurrency(v.total_cost)}
                    </div>
                  </div>
                  <AuctionCountdown end={v.auction_end} size="sm" />
                </Link>
              ))
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
