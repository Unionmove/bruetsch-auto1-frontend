import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtCurrency, fmtKm } from "@/lib/format";
import AuctionCountdown from "./AuctionCountdown";
import { Camera, Wrench, Fuel, Cog, ImageOff } from "lucide-react";

export type VehicleCardData = {
  stock_nr: string;
  brand: string;
  model: string;
  variant?: string | null;
  year?: number | null;
  mileage_km?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  power_ps?: number | null;
  total_cost?: number | null;
  auction_end?: string | null;
  cover_photo?: string | null;
  photo_count?: number;
  damage_count?: number;
};

export default function VehicleCard({ vehicle }: { vehicle: VehicleCardData }) {
  return (
    <Link
      href={`/fahrzeuge/${encodeURIComponent(vehicle.stock_nr)}`}
      className="group block"
    >
      <Card className="overflow-hidden border-brand-line transition-shadow hover:shadow-md p-0 gap-0">
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {vehicle.cover_photo ? (
            <img
              src={vehicle.cover_photo}
              alt={`${vehicle.brand} ${vehicle.model}`}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <ImageOff className="h-8 w-8" />
            </div>
          )}
          <div className="absolute inset-x-0 top-0 p-2 flex items-start justify-between gap-2">
            <Badge
              variant="secondary"
              className="bg-white/90 text-foreground border border-brand-line"
            >
              {vehicle.year ?? "—"}
            </Badge>
            {vehicle.auction_end && (
              <AuctionCountdown end={vehicle.auction_end} size="sm" className="shadow-sm" />
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 flex items-center justify-between text-[11px] text-white bg-gradient-to-t from-black/60 to-transparent">
            <span className="inline-flex items-center gap-1">
              <Camera className="h-3 w-3" />
              {vehicle.photo_count ?? 0} Fotos
            </span>
            {(vehicle.damage_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                {vehicle.damage_count} Schäden
              </span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <div className="font-serif text-lg font-semibold text-brand-navy leading-tight">
              {vehicle.brand} {vehicle.model}
            </div>
            {vehicle.variant && (
              <div className="text-sm text-muted-foreground line-clamp-1">
                {vehicle.variant}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{fmtKm(vehicle.mileage_km)}</span>
            {vehicle.fuel && (
              <span className="inline-flex items-center gap-1">
                <Fuel className="h-3 w-3" />
                {vehicle.fuel}
              </span>
            )}
            {vehicle.transmission && (
              <span className="inline-flex items-center gap-1">
                <Cog className="h-3 w-3" />
                {vehicle.transmission}
              </span>
            )}
            {vehicle.power_ps != null && <span>{vehicle.power_ps} PS</span>}
          </div>

          <div className="flex items-end justify-between pt-1 border-t border-brand-line">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Gesamtkosten
              </div>
              <div className="font-serif text-xl font-semibold text-brand-navy">
                {fmtCurrency(vehicle.total_cost ?? null)}
              </div>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {vehicle.stock_nr}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
