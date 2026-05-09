import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, ImageOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type GalleryPhoto = {
  id: number | string;
  src: string | null;
  caption?: string | null;
  type?: string;
};

const TYPE_LABEL: Record<string, string> = {
  vehicle: "Fahrzeug",
  highlight: "Highlight",
  damage: "Schaden",
};

export default function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const valid = photos.filter((p) => !!p.src);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    if (index >= valid.length) setIndex(0);
  }, [valid.length, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % Math.max(valid.length, 1));
      if (e.key === "ArrowLeft")
        setIndex((i) => (i - 1 + Math.max(valid.length, 1)) % Math.max(valid.length, 1));
      if (e.key === "Escape") setLightbox(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [valid.length]);

  if (valid.length === 0) {
    return (
      <div className="aspect-[4/3] bg-muted rounded-md flex items-center justify-center text-muted-foreground">
        <ImageOff className="h-10 w-10" />
      </div>
    );
  }

  const current = valid[index];
  const prev = () => setIndex((i) => (i - 1 + valid.length) % valid.length);
  const next = () => setIndex((i) => (i + 1) % valid.length);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] bg-black/90 rounded-md overflow-hidden group">
        <img
          src={current.src!}
          alt={current.caption ?? `Foto ${index + 1}`}
          className="absolute inset-0 h-full w-full object-contain"
        />
        {current.type && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-md bg-black/60 backdrop-blur px-2 py-1 text-xs text-white">
            {TYPE_LABEL[current.type] ?? current.type}
          </div>
        )}
        <div className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-md bg-black/60 backdrop-blur px-2 py-1 text-xs text-white tabular-nums">
          {index + 1} / {valid.length}
        </div>
        <button
          aria-label="Vergrößern"
          onClick={() => setLightbox(true)}
          className="absolute bottom-3 right-3 inline-flex items-center justify-center h-9 w-9 rounded-md bg-black/60 backdrop-blur text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          aria-label="Vorheriges Foto"
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          aria-label="Nächstes Foto"
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {current.caption && (
        <div className="text-xs text-muted-foreground text-center">
          {current.caption}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {valid.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setIndex(i)}
            className={cn(
              "relative h-16 w-24 flex-shrink-0 rounded overflow-hidden ring-2 transition-all",
              i === index
                ? "ring-brand-navy"
                : "ring-transparent hover:ring-brand-line"
            )}
            aria-label={`Foto ${i + 1}`}
          >
            <img
              src={p.src!}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {p.type && p.type !== "vehicle" && (
              <span className="absolute bottom-0 inset-x-0 text-[9px] uppercase tracking-wider text-white bg-black/60 px-1 py-0.5 text-center">
                {TYPE_LABEL[p.type] ?? p.type}
              </span>
            )}
          </button>
        ))}
      </div>

      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent
          className="!max-w-[100vw] !w-screen !h-screen p-0 border-0 bg-black/95 sm:rounded-none"
          showCloseButton={false}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={current.src!}
              alt={current.caption ?? ""}
              className="max-h-full max-w-full object-contain"
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-4 right-4 text-white hover:bg-white/10"
              onClick={() => setLightbox(false)}
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </Button>
            <button
              aria-label="Vorheriges Foto"
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              aria-label="Nächstes Foto"
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
              {current.caption ? `${current.caption} · ` : ""}
              {index + 1} / {valid.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
