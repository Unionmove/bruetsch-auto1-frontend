import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import VehicleCard from "@/components/VehicleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, RotateCcw, Search } from "lucide-react";

type Sort =
  | "price_asc"
  | "price_desc"
  | "km_asc"
  | "km_desc"
  | "year_desc"
  | "year_asc"
  | "ending_soon";

const SORT_LABELS: Record<Sort, string> = {
  ending_soon: "Auktion endet zuerst",
  price_asc: "Preis aufsteigend",
  price_desc: "Preis absteigend",
  km_asc: "Kilometerstand aufsteigend",
  km_desc: "Kilometerstand absteigend",
  year_desc: "Baujahr neuste zuerst",
  year_asc: "Baujahr älteste zuerst",
};

const numOrUndef = (v: string) => {
  if (!v.trim()) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const ALL_BRANDS = "__all__";

export default function VehicleList() {
  const [brand, setBrand] = useState<string>(ALL_BRANDS);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [kmMin, setKmMin] = useState("");
  const [kmMax, setKmMax] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("ending_soon");

  const filters = useMemo(
    () => ({
      brand: brand === ALL_BRANDS ? undefined : brand,
      priceMin: numOrUndef(priceMin),
      priceMax: numOrUndef(priceMax),
      kmMin: numOrUndef(kmMin),
      kmMax: numOrUndef(kmMax),
      yearMin: numOrUndef(yearMin),
      yearMax: numOrUndef(yearMax),
      search: search.trim() || undefined,
      sort,
    }),
    [brand, priceMin, priceMax, kmMin, kmMax, yearMin, yearMax, search, sort]
  );

  const brandsQuery = trpc.auto1.brands.useQuery();
  const listQuery = trpc.auto1.list.useQuery(filters);

  const reset = () => {
    setBrand(ALL_BRANDS);
    setPriceMin("");
    setPriceMax("");
    setKmMin("");
    setKmMax("");
    setYearMin("");
    setYearMax("");
    setSearch("");
    setSort("ending_soon");
  };

  const activeFilterCount = [
    brand !== ALL_BRANDS,
    priceMin,
    priceMax,
    kmMin,
    kmMax,
    yearMin,
    yearMax,
    search,
  ].filter(Boolean).length;

  return (
    <div className="container py-8 sm:py-10 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Bestand
          </div>
          <h1 className="mt-1 font-serif text-3xl sm:text-4xl font-semibold text-brand-navy">
            Fahrzeuge in der Auktion
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {listQuery.data
              ? `${listQuery.data.length} Treffer`
              : "—"}
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="w-[14rem] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {SORT_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid lg:grid-cols-[20rem_1fr] gap-6">
        {/* Filters */}
        <Card className="p-5 border-brand-line h-fit lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-brand-navy">
              <Filter className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-brand-navy text-white text-[10px] px-1.5 py-0.5">
                  {activeFilterCount}
                </span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Zurücksetzen
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Suche</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Marke, Modell, Stock-Nr."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Marke</Label>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_BRANDS}>Alle Marken</SelectItem>
                  {brandsQuery.data?.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Preis (€)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="ab"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="bis"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Kilometerstand</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="ab"
                  value={kmMin}
                  onChange={(e) => setKmMin(e.target.value)}
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="bis"
                  value={kmMax}
                  onChange={(e) => setKmMax(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Baujahr</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="ab"
                  value={yearMin}
                  onChange={(e) => setYearMin(e.target.value)}
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="bis"
                  value={yearMax}
                  onChange={(e) => setYearMax(e.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Results */}
        <div>
          {listQuery.isError ? (
            <Card className="p-10 text-center border-brand-line">
              <div className="font-serif text-lg font-semibold text-brand-navy">
                Fahrzeuge konnten nicht geladen werden
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Bitte Seite neu laden oder API-Verbindung prüfen.
              </p>
            </Card>
          ) : listQuery.isLoading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] w-full rounded-md" />
              ))}
            </div>
          ) : listQuery.data && listQuery.data.length > 0 ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {listQuery.data.map((v) => (
                <VehicleCard key={v.stock_nr} vehicle={v} />
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center border-brand-line">
              <div className="font-serif text-lg font-semibold text-brand-navy">
                Keine Fahrzeuge gefunden
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Bitte passen Sie die Filter an oder setzen Sie sie zurück.
              </p>
              {activeFilterCount > 0 && (
                <Button onClick={reset} variant="outline" className="mt-4 bg-card">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Filter zurücksetzen
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
