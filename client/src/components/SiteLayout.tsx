import { Link, useLocation } from "wouter";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Gavel, LayoutDashboard, Car } from "lucide-react";

type NavItem = { href: string; label: string; icon: typeof Car };
const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fahrzeuge", label: "Fahrzeuge", icon: Car },
];

function NavLink({ item, current }: { item: NavItem; current: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        current
          ? "bg-white/10 text-white"
          : "text-white/75 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  );
}

export default function SiteLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const currentTop =
    location === "/"
      ? "/"
      : location.startsWith("/fahrzeuge")
        ? "/fahrzeuge"
        : location;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="bg-brand-navy text-white">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-md bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
              <Gavel className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-serif text-base sm:text-lg font-semibold tracking-tight">
                Autohaus Brütsch
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                AUTO1 Import-Agent
              </div>
            </div>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink key={item.href} item={item} current={currentTop === item.href} />
            ))}
          </nav>
        </div>
        {/* Mobile nav */}
        <div className="sm:hidden border-t border-white/10">
          <div className="container flex items-center gap-1 py-2 overflow-x-auto">
            {NAV.map((item) => (
              <NavLink key={item.href} item={item} current={currentTop === item.href} />
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-brand-line bg-white/60 mt-12">
        <div className="container py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-muted-foreground">
          <div>
            <span className="font-serif font-semibold text-brand-navy">Autohaus Brütsch</span>
            <span className="mx-2">·</span>
            <span>AUTO1 Import-Agent</span>
          </div>
          <div className="text-xs">
            Demo-Daten — DB &amp; Fotos austauschbar via{" "}
            <code className="rounded bg-muted px-1 py-0.5">AUTO1_DB_PATH</code>
            {" / "}
            <code className="rounded bg-muted px-1 py-0.5">AUTO1_PHOTOS_DIR</code>
          </div>
        </div>
      </footer>
    </div>
  );
}
