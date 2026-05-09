# Brütsch AUTO1 Frontend

Modernes Web-Frontend für den AUTO1 Import-Agenten des Autohaus Brütsch. React + Vite + Tailwind, Daten direkt aus Supabase (Postgres).

## Features

- Dashboard mit KPIs (Anzahl Fahrzeuge, Preisspanne, laufende Auktionen)
- Fahrzeugliste mit Filter (Marke, Preis, km, BJ) und Sortierung
- Detailseite mit Foto-Galerie (Lightbox), Schäden, Ausstattung, Preiskalkulation
- Live-Auktions-Countdown
- Responsive (Mobile-first)

## Stack

- **Frontend**: React 19, Vite 7, Tailwind 4, wouter, @tanstack/react-query
- **DB / API**: Supabase (Postgres) – direkter Client-Zugriff via `@supabase/supabase-js`
- **Hosting**: Vercel (statische SPA, keine Functions nötig)

## Environment Variables

Beide ENV-Vars müssen in Vercel gesetzt sein:

```
VITE_SUPABASE_URL=https://cdlzopawrenztewojvyi.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

## Lokales Setup

```bash
pnpm install
cp .env.example .env  # ENV-Vars eintragen
pnpm dev
```

## Deploy

Push auf `main` → Vercel deployt automatisch.

## Datenmodell

Tabellen im Supabase-Projekt `auto1` (eu-central-1):

- `vehicles` — Fahrzeugstammdaten
- `auctions` — Auktionsdaten (Gebot, Gebühr, Status, Endzeit)
- `photos` — Foto-URLs (Typ: `vehicle`, `damage`, `highlight`)
- `damages` — Schadensliste mit Schweregrad und Position
- `equipment` — Ausstattungsmerkmale

Schema unter `data/schema.sql` (Postgres-Migration).

## Datenquellen-Switch

Wenn der Cloud-Computer-Agent auf Supabase schreibt, sind keine Frontend-Änderungen nötig. Das Frontend liest live aus den Supabase-Tabellen.
