# AUTO1-Agent → Supabase

Adapter, mit dem der bestehende AUTO1-Import-Agent (Cloud Computer) die gefundenen Fahrzeuge direkt in das Supabase-Projekt `auto1` schreibt — inklusive Foto-Upload in den Storage-Bucket `auto1-photos`.

## Setup auf dem Cloud Computer

```bash
cd /home/ubuntu/auto1_agent
pip install supabase
cp /pfad/zu/supabase_writer.py .
```

## ENV-Variablen

```bash
export SUPABASE_URL="https://cdlzopawrenztewojvyi.supabase.co"
export SUPABASE_SERVICE_KEY="<service-role-key aus Supabase Settings>"
```

> ⚠️ **Niemals den anon-Key hier verwenden!** Der Agent braucht Schreibrechte → Service-Role-Key.
> Den Service-Role-Key findest du in Supabase Dashboard → Settings → API Keys.

## Einmaliger Import (alle bestehenden SQLite-Daten)

```bash
python3 supabase_writer.py \
  --sqlite /home/ubuntu/auto1_agent/db/auto1.sqlite3 \
  --photos /home/ubuntu/auto1_agent/photos \
  --upload-photos
```

Das migriert alle Fahrzeuge, Auktionen, Schäden, Ausstattung sowie alle Fotos im Verzeichnis nach Supabase. Die Foto-URLs in der `photos`-Tabelle zeigen danach auf die public URLs in Supabase Storage.

## Im laufenden Agent verwenden

```python
from supabase_writer import SupabaseWriter
import os

sw = SupabaseWriter(
    url=os.environ["SUPABASE_URL"],
    service_key=os.environ["SUPABASE_SERVICE_KEY"],
    photos_dir="/home/ubuntu/auto1_agent/photos",
)

# Wenn der Agent ein neues Fahrzeug findet:
sw.upsert_vehicle({
    "stock_nr": "A1-2026-0042",
    "brand": "BMW",
    "model": "320d",
    "variant": "Touring Advantage",
    "year": 2021,
    "mileage_km": 78_500,
    "fuel": "Diesel",
    "transmission": "Automatik",
    "power_ps": 190,
    "power_kw": 140,
    "body_type": "Kombi",
    "color": "Alpinweiß",
    "vin": "WBA8E5...",
    "first_reg": "2021-03-15",
    "doors": 5,
    "seats": 5,
    "emission_class": "Euro 6d",
    "description": "Scheckheftgepflegt, ...",
})

sw.upsert_auction({
    "stock_nr": "A1-2026-0042",
    "min_bid": 18500.00,
    "service_fee": 449.00,
    "total_cost": 18949.00,
    "currency": "EUR",
    "auction_end": "2026-05-12T15:30:00Z",
    "status": "live",
    "bids_count": 0,
    "auction_url": "https://auto1.com/...",
})

sw.replace_damages("A1-2026-0042", [
    {"type": "Lackschaden", "severity": "leicht",
     "position": "Stoßstange hinten", "description": "Kratzer 5cm"},
])

sw.replace_equipment("A1-2026-0042", [
    {"name": "Navigationssystem", "category": "Multimedia"},
    {"name": "Sitzheizung vorne", "category": "Komfort"},
])

# Fotos vom lokalen Verzeichnis nach Supabase Storage:
sw.upload_photos("A1-2026-0042")
```

## Foto-Konventionen

- Lokaler Pfad: `/home/ubuntu/auto1_agent/photos/<STOCK_NR>/*.jpg|png|webp`
- Dateinamen-basiertes Auto-Tagging:
  - enthält `damage` oder `schaden` → `type='damage'`
  - enthält `highlight` → `type='highlight'`
  - sonst → `type='vehicle'`
- Reihenfolge wird per `sort_order` aus alphabetischer Sortierung übernommen.
