import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  Fingerprint,
  Fuel,
  Gauge,
  Cog,
  Palette,
  Users,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Car as CarIcon,
} from "lucide-react";
import {
  fmtCurrency,
  fmtDate,
  fmtDateTime,
  fmtKm,
  fmtNumber,
} from "@/lib/format";
import AuctionCountdown from "@/components/AuctionCountdown";
import PhotoGallery from "@/components/PhotoGallery";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<string, string> = {
  leicht: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  mittel: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
  stark: "bg-red-50 text-brand-red ring-1 ring-red-100",
};

function Spec({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CarIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="h-8 w-8 rounded bg-secondary text-brand-navy flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-medium text-foreground truncate">{value}</div>
      </div>
    </div>
  );
}

export default function VehicleDetail() {
  const [, params] = useRoute<{ id: string }>("/fahrzeuge/:id");
  const stockNr = params?.id ? decodeURIComponent(params.id) : "";

  const { data, isLoading, isError } = trpc.auto1.detail.useQuery(
    { stockNr },
    { enabled: !!stockNr }
  );

  if (isLoading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-6 w-40" />
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          <Skeleton className="aspect-[4/3] w-full" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container py-16 text-center">
        <h1 className="font-serif text-2xl text-brand-navy">Fahrzeug nicht gefunden</h1>
        <p className="mt-2 text-muted-foreground">
          Die Stock-Nummer „{stockNr}" ist nicht im aktuellen Bestand.
        </p>
        <Link
          href="/fahrzeuge"
          className="inline-flex items-center gap-2 mt-6 text-brand-navy hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück zur Liste
        </Link>
      </div>
    );
  }

  const { vehicle, auction, photos, damages, equipment } = data;

  // Gruppe Equipment by category
  const eqByCat = equipment.reduce<Record<string, typeof equipment>>((acc, e) => {
    const cat = e.category ?? "Sonstiges";
    (acc[cat] ??= []).push(e);
    return acc;
  }, {});
  const categoriesOrder = [
    "Komfort",
    "Sicherheit",
    "Multimedia",
    "Exterieur",
    "Sonstiges",
  ];
  const sortedCats = Object.keys(eqByCat).sort(
    (a, b) =>
      (categoriesOrder.indexOf(a) === -1 ? 99 : categoriesOrder.indexOf(a)) -
      (categoriesOrder.indexOf(b) === -1 ? 99 : categoriesOrder.indexOf(b))
  );

  return (
    <div className="container py-6 sm:py-10 space-y-6">
      <Link
        href="/fahrzeuge"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück zur Fahrzeugliste
      </Link>

      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-secondary text-brand-navy font-mono">
              {vehicle.stock_nr}
            </Badge>
            {auction?.status && (
              <Badge
                variant={auction.status === "live" ? "default" : "secondary"}
                className={cn(
                  auction.status === "live" && "bg-emerald-600 hover:bg-emerald-600"
                )}
              >
                {auction.status === "live" ? "Live-Auktion" : auction.status}
              </Badge>
            )}
          </div>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-semibold text-brand-navy leading-tight">
            {vehicle.brand} {vehicle.model}
          </h1>
          {vehicle.variant && (
            <div className="mt-1 text-base text-muted-foreground">{vehicle.variant}</div>
          )}
        </div>
        {auction?.auction_end && (
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 text-right">
              Auktion endet
            </div>
            <AuctionCountdown end={auction.auction_end} size="lg" />
            <div className="text-xs text-muted-foreground text-right mt-1">
              {fmtDateTime(auction.auction_end)}
            </div>
          </div>
        )}
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
        {/* Left column: Gallery + tabs */}
        <div className="space-y-6 min-w-0">
          <Card className="p-3 sm:p-4 border-brand-line">
            <PhotoGallery
              photos={photos.map((p) => ({
                id: p.id,
                src: p.src,
                caption: p.caption,
                type: p.type,
              }))}
            />
          </Card>

          <Card className="p-5 border-brand-line">
            <Tabs defaultValue="overview">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="overview">Übersicht</TabsTrigger>
                <TabsTrigger value="damages">
                  Schäden
                  {damages.length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-secondary text-brand-navy text-[10px] px-1.5">
                      {damages.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="equipment">
                  Ausstattung
                  {equipment.length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-secondary text-brand-navy text-[10px] px-1.5">
                      {equipment.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-5 space-y-5">
                {vehicle.description && (
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {vehicle.description}
                  </p>
                )}
                <div className="grid sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 sm:divide-x divide-brand-line">
                  <div className="sm:pr-6 divide-y divide-brand-line">
                    <Spec icon={Calendar} label="Baujahr" value={vehicle.year ?? "—"} />
                    <Spec
                      icon={Calendar}
                      label="Erstzulassung"
                      value={fmtDate(vehicle.first_reg)}
                    />
                    <Spec icon={Gauge} label="Kilometerstand" value={fmtKm(vehicle.mileage_km)} />
                    <Spec icon={Fuel} label="Kraftstoff" value={vehicle.fuel ?? "—"} />
                    <Spec icon={Cog} label="Getriebe" value={vehicle.transmission ?? "—"} />
                  </div>
                  <div className="sm:pl-6 divide-y divide-brand-line">
                    <Spec
                      icon={Gauge}
                      label="Leistung"
                      value={
                        vehicle.power_ps
                          ? `${vehicle.power_ps} PS${vehicle.power_kw ? ` · ${vehicle.power_kw} kW` : ""}`
                          : "—"
                      }
                    />
                    <Spec icon={CarIcon} label="Karosserie" value={vehicle.body_type ?? "—"} />
                    <Spec icon={Palette} label="Farbe" value={vehicle.color ?? "—"} />
                    <Spec
                      icon={Users}
                      label="Sitze / Türen"
                      value={`${fmtNumber(vehicle.seats)} / ${fmtNumber(vehicle.doors)}`}
                    />
                    <Spec
                      icon={Fingerprint}
                      label="VIN"
                      value={
                        <span className="font-mono text-xs">{vehicle.vin ?? "—"}</span>
                      }
                    />
                  </div>
                </div>
                {vehicle.emission_class && (
                  <div className="text-xs text-muted-foreground">
                    Schadstoffklasse: <span className="font-medium text-foreground">{vehicle.emission_class}</span>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="damages" className="mt-5">
                {damages.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground inline-flex flex-col items-center gap-2 w-full">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    Keine Schäden dokumentiert.
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {damages.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-md border border-brand-line overflow-hidden bg-card"
                      >
                        {d.photo && (
                          <div className="aspect-[16/10] bg-muted overflow-hidden">
                            <img
                              src={d.photo}
                              alt={`${d.type} – ${d.position}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-sm text-foreground">
                              {d.type}
                            </div>
                            <span
                              className={cn(
                                "text-[10px] uppercase tracking-widest rounded px-1.5 py-0.5",
                                SEVERITY_STYLES[d.severity] ?? SEVERITY_STYLES.leicht
                              )}
                            >
                              {d.severity}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {d.position}
                          </div>
                          {d.description && (
                            <div className="text-sm text-foreground/90 leading-snug">
                              {d.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="equipment" className="mt-5">
                {equipment.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Keine Ausstattungsmerkmale hinterlegt.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {sortedCats.map((cat) => (
                      <div key={cat}>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                          {cat}
                        </div>
                        <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                          {eqByCat[cat].map((e) => (
                            <li
                              key={e.id}
                              className="flex items-start gap-2 text-sm text-foreground/90"
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                              <span>{e.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Right column: Auction & price calculation */}
        <aside className="space-y-6 lg:sticky lg:top-4 h-fit">
          <Card className="border-brand-line overflow-hidden">
            <div className="bg-brand-navy text-white px-5 py-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                Preiskalkulation
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-serif text-3xl font-semibold">
                  {fmtCurrency(auction?.total_cost ?? null, auction?.currency ?? "EUR")}
                </span>
                <span className="text-sm text-white/75">Gesamtkosten</span>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mindestgebot</span>
                <span className="font-medium tabular-nums">
                  {fmtCurrency(auction?.min_bid ?? null, auction?.currency ?? "EUR")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />
                  AUTO1 Service-Gebühr
                </span>
                <span className="font-medium tabular-nums">
                  {fmtCurrency(auction?.service_fee ?? null, auction?.currency ?? "EUR")}
                </span>
              </div>
              <div className="border-t border-brand-line pt-3 flex justify-between text-sm">
                <span className="font-semibold text-brand-navy">Summe</span>
                <span className="font-semibold tabular-nums text-brand-navy">
                  {fmtCurrency(auction?.total_cost ?? null, auction?.currency ?? "EUR")}
                </span>
              </div>
              {auction?.bids_count != null && (
                <div className="text-xs text-muted-foreground pt-1">
                  Bisherige Gebote: <span className="font-medium text-foreground">{auction.bids_count}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5 border-brand-line space-y-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Kurzfakten
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Fotos</div>
                <div className="font-medium">{photos.length}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Schäden</div>
                <div className="font-medium inline-flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                  {damages.length}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Ausstattung</div>
                <div className="font-medium">{equipment.length} Positionen</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="font-medium capitalize">
                  {auction?.status ?? "—"}
                </div>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
