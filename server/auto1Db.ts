import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Brütsch AUTO1 Import-Agent — Datenzugriffsschicht.
 *
 * Diese Schicht liest die Auto1-Daten aus einem read-only JSON-Snapshot
 * (`data/auto1-snapshot.json`), der beim Build aus der echten/Demo-SQLite-DB
 * erzeugt wird (`scripts/export-snapshot.mjs`).
 *
 * Vorteile:
 *  - Läuft auf Vercel/Serverless ohne native Bindings.
 *  - Schnell (alles im RAM).
 *  - API-Schnittstelle (tRPC) bleibt unverändert.
 *
 * Der spätere Wechsel auf eine echte Live-DB (z. B. Supabase) tauscht
 * lediglich diese Schicht aus — Frontend und Router bleiben gleich.
 */

const SNAPSHOT_PATH =
  process.env.AUTO1_SNAPSHOT_PATH ||
  resolve(process.cwd(), "data/auto1-snapshot.json");

// ---- Types -----------------------------------------------------------------

export type VehicleRow = {
  stock_nr: string;
  brand: string;
  model: string;
  variant: string | null;
  year: number | null;
  mileage_km: number | null;
  fuel: string | null;
  transmission: string | null;
  power_ps: number | null;
  power_kw: number | null;
  body_type: string | null;
  color: string | null;
  vin: string | null;
  first_reg: string | null;
  doors: number | null;
  seats: number | null;
  emission_class: string | null;
  description: string | null;
};

export type AuctionRow = {
  stock_nr: string;
  min_bid: number;
  service_fee: number;
  total_cost: number;
  currency: string | null;
  auction_end: string;
  status: string;
  bids_count: number | null;
  auction_url: string | null;
};

export type PhotoRow = {
  id: number;
  stock_nr: string;
  type: "vehicle" | "damage" | "highlight" | string;
  url: string | null;
  local_path: string | null;
  sort_order: number | null;
  caption: string | null;
};

export type DamageRow = {
  id: number;
  stock_nr: string;
  type: string;
  severity: string;
  position: string;
  description: string | null;
  photo_url: string | null;
  photo_local: string | null;
};

export type EquipmentRow = {
  id: number;
  stock_nr: string;
  name: string;
  category: string | null;
};

type Snapshot = {
  meta: { exportedAt: string; source: string };
  vehicles: VehicleRow[];
  auctions: AuctionRow[];
  photos: PhotoRow[];
  damages: DamageRow[];
  equipment: EquipmentRow[];
};

// ---- Snapshot loader -------------------------------------------------------

let _snap: Snapshot | null = null;

function loadSnapshot(): Snapshot {
  if (_snap) return _snap;
  if (!existsSync(SNAPSHOT_PATH)) {
    throw new Error(
      `Snapshot nicht gefunden: ${SNAPSHOT_PATH}. Bitte 'node scripts/export-snapshot.mjs' ausführen.`
    );
  }
  const raw = readFileSync(SNAPSHOT_PATH, "utf8");
  _snap = JSON.parse(raw) as Snapshot;
  // Re-normalize auctions for legacy auctions stored without auction_end yet
  // (defensive — keeps tests green if columns are missing on the real DB).
  for (const a of _snap.auctions) {
    if (a.auction_end == null) (a as any).auction_end = "";
  }
  return _snap;
}

// Exposed for tests that still expect a "db-like" interface.
export function getAuto1Db() {
  const s = loadSnapshot();
  // Minimal shim that supports the few count queries used in the unit tests.
  return {
    prepare(sql: string) {
      return {
        get(): { c: number } {
          if (/COUNT\(\*\) AS c FROM vehicles/i.test(sql)) return { c: s.vehicles.length };
          if (/COUNT\(\*\) AS c FROM auctions/i.test(sql)) return { c: s.auctions.length };
          if (/COUNT\(\*\) AS c FROM photos/i.test(sql)) return { c: s.photos.length };
          if (/COUNT\(\*\) AS c FROM damages/i.test(sql)) return { c: s.damages.length };
          if (/COUNT\(\*\) AS c FROM equipment/i.test(sql)) return { c: s.equipment.length };
          return { c: 0 };
        },
      };
    },
  };
}

// ---- Filters / Sorts -------------------------------------------------------

export type VehicleListFilters = {
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  kmMin?: number;
  kmMax?: number;
  yearMin?: number;
  yearMax?: number;
  search?: string;
};
export type VehicleListSort =
  | "price_asc"
  | "price_desc"
  | "km_asc"
  | "km_desc"
  | "year_desc"
  | "year_asc"
  | "ending_soon";

export type VehicleListItem = VehicleRow & {
  total_cost: number | null;
  min_bid: number | null;
  service_fee: number | null;
  auction_end: string | null;
  auction_status: string | null;
  bids_count: number | null;
  cover_photo: string | null;
  photo_count: number;
  damage_count: number;
};

// ---- Public URL helpers ----------------------------------------------------

/**
 * Liefert eine öffentliche URL für ein Foto.
 * Bevorzugt die DB-`url`-Spalte (Picsum/AUTO1-CDN) — der lokale Pfad
 * funktioniert nur, wenn das Backend ein Foto-Verzeichnis serviert
 * (Standalone-Modus). Auf Vercel ist immer die URL maßgeblich.
 */
export function photoToUrl(row: {
  url?: string | null;
  local_path?: string | null;
}): string | null {
  return row.url ?? null;
}

// ---- Helpers ---------------------------------------------------------------

const cmpNullable = (
  a: number | string | null | undefined,
  b: number | string | null | undefined,
  dir: "asc" | "desc"
): number => {
  // NULLs immer ans Ende
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a < b) return dir === "asc" ? -1 : 1;
  if (a > b) return dir === "asc" ? 1 : -1;
  return 0;
};

// ---- Queries ---------------------------------------------------------------

export function listVehicles(
  filters: VehicleListFilters = {},
  sort: VehicleListSort = "ending_soon"
): VehicleListItem[] {
  const s = loadSnapshot();
  const auctionsByStock = new Map(s.auctions.map((a) => [a.stock_nr, a]));
  const photosByStock = new Map<string, PhotoRow[]>();
  const damagesByStock = new Map<string, DamageRow[]>();
  for (const p of s.photos) {
    if (!photosByStock.has(p.stock_nr)) photosByStock.set(p.stock_nr, []);
    photosByStock.get(p.stock_nr)!.push(p);
  }
  for (const d of s.damages) {
    if (!damagesByStock.has(d.stock_nr)) damagesByStock.set(d.stock_nr, []);
    damagesByStock.get(d.stock_nr)!.push(d);
  }

  const q = filters.search?.trim().toLowerCase();

  let items: VehicleListItem[] = s.vehicles
    .filter((v) => {
      if (filters.brand && v.brand !== filters.brand) return false;
      if (
        filters.kmMin != null &&
        (v.mileage_km == null || v.mileage_km < filters.kmMin)
      )
        return false;
      if (
        filters.kmMax != null &&
        (v.mileage_km == null || v.mileage_km > filters.kmMax)
      )
        return false;
      if (filters.yearMin != null && (v.year == null || v.year < filters.yearMin))
        return false;
      if (filters.yearMax != null && (v.year == null || v.year > filters.yearMax))
        return false;
      const a = auctionsByStock.get(v.stock_nr);
      if (
        filters.priceMin != null &&
        (a?.total_cost == null || a.total_cost < filters.priceMin)
      )
        return false;
      if (
        filters.priceMax != null &&
        (a?.total_cost == null || a.total_cost > filters.priceMax)
      )
        return false;
      if (q) {
        const haystack =
          `${v.brand} ${v.model} ${v.variant ?? ""} ${v.stock_nr}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .map((v) => {
      const a = auctionsByStock.get(v.stock_nr) ?? null;
      const photos = photosByStock.get(v.stock_nr) ?? [];
      const cover =
        photos
          .filter((p) => p.type === "vehicle" || p.type === "highlight")
          .sort(
            (x, y) =>
              (x.sort_order ?? 0) - (y.sort_order ?? 0) || x.id - y.id
          )[0] ?? photos[0];
      return {
        ...v,
        min_bid: a?.min_bid ?? null,
        service_fee: a?.service_fee ?? null,
        total_cost: a?.total_cost ?? null,
        auction_end: a?.auction_end ?? null,
        auction_status: a?.status ?? null,
        bids_count: a?.bids_count ?? null,
        photo_count: photos.length,
        damage_count: (damagesByStock.get(v.stock_nr) ?? []).length,
        cover_photo: cover ? photoToUrl(cover) : null,
      };
    });

  switch (sort) {
    case "price_asc":
      items.sort((a, b) => cmpNullable(a.total_cost, b.total_cost, "asc"));
      break;
    case "price_desc":
      items.sort((a, b) => cmpNullable(a.total_cost, b.total_cost, "desc"));
      break;
    case "km_asc":
      items.sort((a, b) => cmpNullable(a.mileage_km, b.mileage_km, "asc"));
      break;
    case "km_desc":
      items.sort((a, b) => cmpNullable(a.mileage_km, b.mileage_km, "desc"));
      break;
    case "year_desc":
      items.sort((a, b) => cmpNullable(a.year, b.year, "desc"));
      break;
    case "year_asc":
      items.sort((a, b) => cmpNullable(a.year, b.year, "asc"));
      break;
    case "ending_soon":
    default:
      items.sort((a, b) => cmpNullable(a.auction_end, b.auction_end, "asc"));
  }

  return items;
}

export type VehicleDetail = {
  vehicle: VehicleRow;
  auction: AuctionRow | null;
  photos: (PhotoRow & { src: string | null })[];
  damages: (DamageRow & { photo: string | null })[];
  equipment: EquipmentRow[];
};

export function getVehicleDetail(stockNr: string): VehicleDetail | null {
  const s = loadSnapshot();
  const vehicle = s.vehicles.find((v) => v.stock_nr === stockNr);
  if (!vehicle) return null;
  const auction = s.auctions.find((a) => a.stock_nr === stockNr) ?? null;
  const photos = s.photos
    .filter((p) => p.stock_nr === stockNr)
    .sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
    )
    .map((p) => ({ ...p, src: photoToUrl(p) }));
  const damages = s.damages
    .filter((d) => d.stock_nr === stockNr)
    .sort((a, b) => a.id - b.id)
    .map((d) => ({
      ...d,
      photo: photoToUrl({ url: d.photo_url, local_path: d.photo_local }),
    }));
  const equipment = s.equipment
    .filter((e) => e.stock_nr === stockNr)
    .sort(
      (a, b) =>
        (a.category ?? "").localeCompare(b.category ?? "") ||
        a.name.localeCompare(b.name)
    );
  return { vehicle, auction, photos, damages, equipment };
}

export type DashboardStats = {
  vehicleCount: number;
  liveAuctions: number;
  endedAuctions: number;
  totalCostSum: number;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  cheapest: { stock_nr: string; brand: string; model: string; total_cost: number } | null;
  mostExpensive: {
    stock_nr: string;
    brand: string;
    model: string;
    total_cost: number;
  } | null;
  brands: { brand: string; count: number }[];
  endingSoon: {
    stock_nr: string;
    brand: string;
    model: string;
    total_cost: number | null;
    auction_end: string | null;
    cover_photo: string | null;
  }[];
};

export function getDashboardStats(): DashboardStats {
  const s = loadSnapshot();
  const vehicleCount = s.vehicles.length;
  const live = s.auctions.filter((a) => a.status === "live");
  const ended = s.auctions.filter((a) => a.status !== "live");
  const totals = s.auctions
    .map((a) => a.total_cost)
    .filter((n): n is number => typeof n === "number");

  const sum = totals.reduce((acc, n) => acc + n, 0);
  const avg = totals.length ? sum / totals.length : null;
  const min = totals.length ? Math.min(...totals) : null;
  const max = totals.length ? Math.max(...totals) : null;

  const enriched = s.auctions
    .map((a) => {
      const v = s.vehicles.find((x) => x.stock_nr === a.stock_nr);
      if (!v) return null;
      return {
        stock_nr: v.stock_nr,
        brand: v.brand,
        model: v.model,
        total_cost: a.total_cost,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const cheapest =
    enriched.slice().sort((a, b) => a.total_cost - b.total_cost)[0] ?? null;
  const mostExpensive =
    enriched.slice().sort((a, b) => b.total_cost - a.total_cost)[0] ?? null;

  const brandMap = new Map<string, number>();
  for (const v of s.vehicles) brandMap.set(v.brand, (brandMap.get(v.brand) ?? 0) + 1);
  const brands = Array.from(brandMap.entries())
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));

  const photosByStock = new Map<string, PhotoRow[]>();
  for (const p of s.photos) {
    if (!photosByStock.has(p.stock_nr)) photosByStock.set(p.stock_nr, []);
    photosByStock.get(p.stock_nr)!.push(p);
  }

  const endingSoon = live
    .slice()
    .sort((a, b) => (a.auction_end ?? "").localeCompare(b.auction_end ?? ""))
    .slice(0, 4)
    .map((a) => {
      const v = s.vehicles.find((x) => x.stock_nr === a.stock_nr);
      const photos = photosByStock.get(a.stock_nr) ?? [];
      const cover =
        photos
          .filter((p) => p.type === "vehicle" || p.type === "highlight")
          .sort(
            (x, y) =>
              (x.sort_order ?? 0) - (y.sort_order ?? 0) || x.id - y.id
          )[0] ?? photos[0];
      return {
        stock_nr: a.stock_nr,
        brand: v?.brand ?? "",
        model: v?.model ?? "",
        total_cost: a.total_cost,
        auction_end: a.auction_end,
        cover_photo: cover ? photoToUrl(cover) : null,
      };
    });

  return {
    vehicleCount,
    liveAuctions: live.length,
    endedAuctions: ended.length,
    totalCostSum: sum,
    avgPrice: avg,
    minPrice: min,
    maxPrice: max,
    cheapest,
    mostExpensive,
    brands,
    endingSoon,
  };
}

export function listBrands(): string[] {
  const s = loadSnapshot();
  return Array.from(new Set(s.vehicles.map((v) => v.brand))).sort();
}
