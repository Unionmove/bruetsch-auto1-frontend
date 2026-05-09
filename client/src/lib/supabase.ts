import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    "[supabase] Fehlende ENV: VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: "public" },
});

// ===========================================================
// Domain-Typen (matcht Postgres-Schema in Projekt 'auto1')
// ===========================================================

export type Vehicle = {
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
  created_at: string;
};

export type Auction = {
  stock_nr: string;
  min_bid: number | null;
  service_fee: number | null;
  total_cost: number | null;
  currency: string | null;
  auction_end: string | null;
  status: string | null;
  bids_count: number | null;
  auction_url: string | null;
};

export type Photo = {
  id: number;
  stock_nr: string;
  type: "vehicle" | "damage" | "highlight" | string;
  url: string;
  local_path: string | null;
  sort_order: number | null;
  caption: string | null;
};

export type Damage = {
  id: number;
  stock_nr: string;
  type: string | null;
  severity: string | null;
  position: string | null;
  description: string | null;
  photo_url: string | null;
  photo_local: string | null;
};

export type Equipment = {
  id: number;
  stock_nr: string;
  name: string;
  category: string | null;
};

export type VehicleListRow = Vehicle & {
  total_cost: number | null;
  auction_end: string | null;
  status: string | null;
  cover_photo: string | null;
};

export type VehicleDetail = {
  vehicle: Vehicle;
  auction: Auction | null;
  photos: Photo[];
  damages: Damage[];
  equipment: Equipment[];
};

export type DashboardStats = {
  vehicleCount: number;
  liveAuctions: number;
  endedAuctions: number;
  totalCostSum: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  cheapest: { stock_nr: string; brand: string; model: string; total_cost: number } | null;
  mostExpensive: { stock_nr: string; brand: string; model: string; total_cost: number } | null;
  brands: { brand: string; count: number }[];
  endingSoon: {
    stock_nr: string;
    brand: string;
    model: string;
    total_cost: number | null;
    auction_end: string | null;
  }[];
};

export type ListFilters = {
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minKm?: number;
  maxKm?: number;
  minYear?: number;
  maxYear?: number;
  sort?:
    | "price_asc"
    | "price_desc"
    | "km_asc"
    | "km_desc"
    | "year_desc"
    | "year_asc"
    | "ending_soon";
};

// ===========================================================
// Datenzugriffs-Helper
// ===========================================================

export async function fetchDashboard(): Promise<DashboardStats> {
  const [{ data: vehicles }, { data: auctions }, { data: brands }] = await Promise.all([
    supabase.from("vehicles").select("stock_nr, brand, model"),
    supabase.from("auctions").select("stock_nr, total_cost, auction_end, status"),
    supabase.from("vehicles").select("brand"),
  ]);

  const veh = vehicles ?? [];
  const auc = auctions ?? [];
  const now = Date.now();

  const totalCostSum = auc.reduce((s, a) => s + (Number(a.total_cost) || 0), 0);
  const prices = auc.map((a) => Number(a.total_cost) || 0).filter((p) => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const avgPrice = prices.length ? totalCostSum / prices.length : 0;

  const live = auc.filter((a) => {
    if (a.status !== "live") return false;
    const t = a.auction_end ? new Date(a.auction_end).getTime() : 0;
    return t > now;
  }).length;

  const ended = auc.length - live;

  const merged = auc.map((a) => {
    const v = veh.find((x) => x.stock_nr === a.stock_nr);
    return {
      stock_nr: a.stock_nr,
      brand: v?.brand ?? "?",
      model: v?.model ?? "?",
      total_cost: Number(a.total_cost) || 0,
      auction_end: a.auction_end,
    };
  });

  const cheapest = merged.length
    ? [...merged].sort((a, b) => a.total_cost - b.total_cost)[0]
    : null;
  const mostExpensive = merged.length
    ? [...merged].sort((a, b) => b.total_cost - a.total_cost)[0]
    : null;

  const brandCounts = (brands ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.brand] = (acc[r.brand] || 0) + 1;
    return acc;
  }, {});
  const brandsList = Object.entries(brandCounts)
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count);

  const endingSoon = merged
    .filter((m) => m.auction_end && new Date(m.auction_end).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.auction_end!).getTime() - new Date(b.auction_end!).getTime()
    )
    .slice(0, 5);

  return {
    vehicleCount: veh.length,
    liveAuctions: live,
    endedAuctions: ended,
    totalCostSum,
    avgPrice,
    minPrice,
    maxPrice,
    cheapest,
    mostExpensive,
    brands: brandsList,
    endingSoon,
  };
}

export async function fetchVehicleList(filters: ListFilters): Promise<VehicleListRow[]> {
  // 1. Alle Auktionen + Fahrzeuge in 2 Queries (klein, max 100 Zeilen)
  const [{ data: vehicles, error: vErr }, { data: auctions, error: aErr }, { data: photos }] =
    await Promise.all([
      supabase.from("vehicles").select("*"),
      supabase.from("auctions").select("*"),
      supabase
        .from("photos")
        .select("stock_nr, url, sort_order, type")
        .eq("type", "vehicle")
        .order("sort_order", { ascending: true }),
    ]);

  if (vErr) throw vErr;
  if (aErr) throw aErr;

  const aucMap = new Map((auctions ?? []).map((a) => [a.stock_nr, a]));
  const coverMap = new Map<string, string>();
  for (const p of photos ?? []) {
    if (!coverMap.has(p.stock_nr)) coverMap.set(p.stock_nr, p.url);
  }

  let rows: VehicleListRow[] = (vehicles ?? []).map((v) => {
    const a = aucMap.get(v.stock_nr);
    return {
      ...(v as Vehicle),
      total_cost: a?.total_cost ?? null,
      auction_end: a?.auction_end ?? null,
      status: a?.status ?? null,
      cover_photo: coverMap.get(v.stock_nr) ?? null,
    };
  });

  // Filter
  if (filters.brand && filters.brand !== "all") {
    rows = rows.filter((r) => r.brand === filters.brand);
  }
  if (filters.minPrice != null) rows = rows.filter((r) => (r.total_cost ?? 0) >= filters.minPrice!);
  if (filters.maxPrice != null) rows = rows.filter((r) => (r.total_cost ?? Infinity) <= filters.maxPrice!);
  if (filters.minKm != null) rows = rows.filter((r) => (r.mileage_km ?? 0) >= filters.minKm!);
  if (filters.maxKm != null) rows = rows.filter((r) => (r.mileage_km ?? Infinity) <= filters.maxKm!);
  if (filters.minYear != null) rows = rows.filter((r) => (r.year ?? 0) >= filters.minYear!);
  if (filters.maxYear != null) rows = rows.filter((r) => (r.year ?? Infinity) <= filters.maxYear!);

  // Sort
  const sort = filters.sort ?? "price_asc";
  rows.sort((a, b) => {
    switch (sort) {
      case "price_asc":
        return (a.total_cost ?? Infinity) - (b.total_cost ?? Infinity);
      case "price_desc":
        return (b.total_cost ?? -Infinity) - (a.total_cost ?? -Infinity);
      case "km_asc":
        return (a.mileage_km ?? Infinity) - (b.mileage_km ?? Infinity);
      case "km_desc":
        return (b.mileage_km ?? -Infinity) - (a.mileage_km ?? -Infinity);
      case "year_desc":
        return (b.year ?? 0) - (a.year ?? 0);
      case "year_asc":
        return (a.year ?? 0) - (b.year ?? 0);
      case "ending_soon": {
        const ta = a.auction_end ? new Date(a.auction_end).getTime() : Infinity;
        const tb = b.auction_end ? new Date(b.auction_end).getTime() : Infinity;
        return ta - tb;
      }
      default:
        return 0;
    }
  });

  return rows;
}

export async function fetchVehicleDetail(stockNr: string): Promise<VehicleDetail | null> {
  const [{ data: vehicle, error: vErr }, { data: auction }, { data: photos }, { data: damages }, { data: equipment }] =
    await Promise.all([
      supabase.from("vehicles").select("*").eq("stock_nr", stockNr).maybeSingle(),
      supabase.from("auctions").select("*").eq("stock_nr", stockNr).maybeSingle(),
      supabase
        .from("photos")
        .select("*")
        .eq("stock_nr", stockNr)
        .order("type", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase.from("damages").select("*").eq("stock_nr", stockNr).order("id"),
      supabase.from("equipment").select("*").eq("stock_nr", stockNr).order("category").order("name"),
    ]);

  if (vErr || !vehicle) return null;

  return {
    vehicle: vehicle as Vehicle,
    auction: (auction as Auction | null) ?? null,
    photos: (photos as Photo[]) ?? [],
    damages: (damages as Damage[]) ?? [],
    equipment: (equipment as Equipment[]) ?? [],
  };
}

export async function fetchBrands(): Promise<string[]> {
  const { data } = await supabase.from("vehicles").select("brand");
  const set = new Set((data ?? []).map((r) => r.brand));
  return Array.from(set).sort();
}
