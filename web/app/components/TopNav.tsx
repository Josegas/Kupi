import { Search, MapPin } from "lucide-react";

export default function TopNav() {
  return (
    <nav className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-12 h-16 flex items-center gap-6">
        {/* Logo */}
        <span
          className="text-2xl font-bold tracking-tight shrink-0"
          style={{ fontFamily: "var(--font-display)", color: "var(--brand)", letterSpacing: "-0.03em" }}
        >
          Kupi
        </span>

        {/* Buscador */}
        <div className="kupi-input flex-1 flex items-center gap-2 border border-[var(--border)] rounded-xl px-4 h-10 bg-[var(--bg)]">
          <Search size={16} className="text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            placeholder="Busca un restaurante o platillo..."
            className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </div>

        {/* Ubicación */}
        <button className="kupi-link flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)] shrink-0 transition-colors">
          <MapPin size={15} />
          Culiacán, Sin.
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-[var(--brand-tint)] flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-[var(--brand)]">JG</span>
        </div>
      </div>
    </nav>
  );
}
