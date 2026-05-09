"""
Brütsch AUTO1 — Supabase-Adapter für den Import-Agenten

Nutzung im AUTO1-Agent:
    from supabase_writer import SupabaseWriter

    sw = SupabaseWriter(
        url=os.environ["SUPABASE_URL"],
        service_key=os.environ["SUPABASE_SERVICE_KEY"],   # !! SERVICE-ROLE-KEY, nicht anon
        photos_dir="/home/ubuntu/auto1_agent/photos",
    )

    sw.upsert_vehicle(vehicle_dict)
    sw.upsert_auction(auction_dict)
    sw.replace_damages(stock_nr, damage_list)
    sw.replace_equipment(stock_nr, equipment_list)
    sw.upload_photos(stock_nr)   # iteriert /photos/<STOCK_NR>/ und lädt nach Storage hoch

Anforderungen:
    pip install supabase requests

Tabellen-Schema siehe data/schema.sql
Storage-Bucket: 'auto1-photos' (public)
"""

from __future__ import annotations

import os
import mimetypes
from pathlib import Path
from typing import Iterable, Sequence

from supabase import create_client, Client


VEHICLE_FIELDS = (
    "stock_nr", "brand", "model", "variant", "year", "mileage_km", "fuel",
    "transmission", "power_ps", "power_kw", "body_type", "color", "vin",
    "first_reg", "doors", "seats", "emission_class", "description",
)
AUCTION_FIELDS = (
    "stock_nr", "min_bid", "service_fee", "total_cost", "currency",
    "auction_end", "status", "bids_count", "auction_url",
)
DAMAGE_FIELDS = (
    "stock_nr", "type", "severity", "position", "description",
    "photo_url", "photo_local",
)
EQUIPMENT_FIELDS = ("stock_nr", "name", "category")
PHOTO_FIELDS = ("stock_nr", "type", "url", "local_path", "sort_order", "caption")


def _pick(obj: dict, fields: Sequence[str]) -> dict:
    return {k: obj.get(k) for k in fields if k in obj}


class SupabaseWriter:
    def __init__(self, url: str, service_key: str, photos_dir: str | None = None,
                 bucket: str = "auto1-photos"):
        self.client: Client = create_client(url, service_key)
        self.photos_dir = Path(photos_dir) if photos_dir else None
        self.bucket = bucket
        self.public_url_prefix = f"{url.rstrip('/')}/storage/v1/object/public/{bucket}"

    # ----- vehicle / auction -----------------------------------------------

    def upsert_vehicle(self, vehicle: dict) -> None:
        payload = _pick(vehicle, VEHICLE_FIELDS)
        if not payload.get("stock_nr"):
            raise ValueError("vehicle.stock_nr is required")
        self.client.table("vehicles").upsert(payload, on_conflict="stock_nr").execute()

    def upsert_auction(self, auction: dict) -> None:
        payload = _pick(auction, AUCTION_FIELDS)
        if not payload.get("stock_nr"):
            raise ValueError("auction.stock_nr is required")
        self.client.table("auctions").upsert(payload, on_conflict="stock_nr").execute()

    # ----- damages / equipment (replace strategy) --------------------------

    def replace_damages(self, stock_nr: str, damages: Iterable[dict]) -> None:
        self.client.table("damages").delete().eq("stock_nr", stock_nr).execute()
        rows = [_pick({**d, "stock_nr": stock_nr}, DAMAGE_FIELDS) for d in damages]
        if rows:
            self.client.table("damages").insert(rows).execute()

    def replace_equipment(self, stock_nr: str, equipment: Iterable[dict]) -> None:
        self.client.table("equipment").delete().eq("stock_nr", stock_nr).execute()
        rows = [_pick({**e, "stock_nr": stock_nr}, EQUIPMENT_FIELDS) for e in equipment]
        if rows:
            self.client.table("equipment").insert(rows).execute()

    # ----- photos ----------------------------------------------------------

    def upload_photo_file(self, stock_nr: str, local_file: Path,
                          photo_type: str = "vehicle",
                          sort_order: int = 0,
                          caption: str | None = None) -> str:
        """Lädt eine einzelne Foto-Datei hoch, gibt die public URL zurück."""
        key = f"{stock_nr}/{local_file.name}"
        mime = mimetypes.guess_type(local_file.name)[0] or "image/jpeg"

        with open(local_file, "rb") as f:
            data = f.read()

        # Upsert: bei Bedarf vorhandenes Objekt ersetzen
        self.client.storage.from_(self.bucket).upload(
            path=key,
            file=data,
            file_options={"content-type": mime, "upsert": "true"},
        )
        public_url = f"{self.public_url_prefix}/{key}"

        self.client.table("photos").upsert(
            {
                "stock_nr": stock_nr,
                "type": photo_type,
                "url": public_url,
                "local_path": str(local_file),
                "sort_order": sort_order,
                "caption": caption,
            },
            on_conflict="stock_nr,url",
        ).execute()

        return public_url

    def upload_photos(self, stock_nr: str) -> int:
        """
        Lädt alle Fotos aus <photos_dir>/<stock_nr>/ hoch.
        Konvention für Typ: dateiname enthält 'damage' → damage,
        sonst 'highlight' → highlight, sonst 'vehicle'.
        """
        if not self.photos_dir:
            raise RuntimeError("photos_dir not configured")
        folder = self.photos_dir / stock_nr
        if not folder.is_dir():
            return 0

        # Vor dem Upload alte Photos für diesen Stock löschen
        self.client.table("photos").delete().eq("stock_nr", stock_nr).execute()

        files = sorted(p for p in folder.iterdir() if p.is_file()
                       and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
        for idx, f in enumerate(files):
            name = f.name.lower()
            if "damage" in name or "schaden" in name:
                ptype = "damage"
            elif "highlight" in name:
                ptype = "highlight"
            else:
                ptype = "vehicle"
            self.upload_photo_file(stock_nr, f, ptype, sort_order=idx)
        return len(files)


# ---------------------------------------------------------------------------
# Convenience CLI für einmalige Migrations-Runs
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse, sqlite3, json

    ap = argparse.ArgumentParser(description="Brütsch AUTO1 → Supabase Migrator")
    ap.add_argument("--sqlite", required=True, help="Pfad zur auto1.sqlite3")
    ap.add_argument("--photos", required=True, help="Pfad zum photos-Wurzelordner")
    ap.add_argument("--upload-photos", action="store_true",
                    help="auch Fotos in Supabase Storage hochladen")
    args = ap.parse_args()

    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    sw = SupabaseWriter(url=url, service_key=key, photos_dir=args.photos)

    db = sqlite3.connect(args.sqlite)
    db.row_factory = sqlite3.Row

    vehicles = [dict(r) for r in db.execute("SELECT * FROM vehicles")]
    print(f"[{len(vehicles)}] vehicles")

    for v in vehicles:
        sn = v["stock_nr"]
        sw.upsert_vehicle(v)

        auc = db.execute("SELECT * FROM auctions WHERE stock_nr=?", (sn,)).fetchone()
        if auc:
            sw.upsert_auction(dict(auc))

        damages = [dict(r) for r in
                   db.execute("SELECT * FROM damages WHERE stock_nr=?", (sn,))]
        sw.replace_damages(sn, damages)

        equipment = [dict(r) for r in
                     db.execute("SELECT * FROM equipment WHERE stock_nr=?", (sn,))]
        sw.replace_equipment(sn, equipment)

        if args.upload_photos:
            n = sw.upload_photos(sn)
            print(f"  {sn}: vehicle/auction OK, {len(damages)} damages, "
                  f"{len(equipment)} eq, {n} photos uploaded")
        else:
            # Falls Fotos schon URLs in der SQLite haben (z. B. CDN-Link):
            photos = [dict(r) for r in
                      db.execute("SELECT * FROM photos WHERE stock_nr=?", (sn,))]
            if photos:
                sw.client.table("photos").delete().eq("stock_nr", sn).execute()
                rows = [_pick(p, PHOTO_FIELDS) for p in photos]
                if rows:
                    sw.client.table("photos").insert(rows).execute()
            print(f"  {sn}: vehicle/auction OK, {len(damages)} damages, "
                  f"{len(equipment)} eq, {len(photos)} photo URLs")

    print("Done.")
