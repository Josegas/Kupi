"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";
import KupiLogo from "./KupiLogo";
import ThemeToggle from "./ThemeToggle";
import { useLocation, searchAddress, GeoSuggestion } from "../lib/location";

export default function TopNav() {
  const { location, setLocation } = useLocation();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openEdit = () => {
    setInput("");
    setSuggestions([]);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancel = () => {
    setEditing(false);
    setSuggestions([]);
  };

  const pickSuggestion = (s: GeoSuggestion) => {
    setLocation({ lat: s.lat, lng: s.lng, label: s.label });
    setEditing(false);
    setSuggestions([]);
  };

  const handleInput = useCallback((value: string) => {
    setInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchAddress(value);
      setSuggestions(results);
      setSearching(false);
    }, 400);
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        cancel();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-10 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-12 h-20 flex items-center gap-6">
        {/* Logo */}
        <KupiLogo size={40} />

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
        {editing ? (
          <div ref={containerRef} className="relative shrink-0">
            <div className="kupi-input flex items-center gap-2 border border-[var(--border)] rounded-xl px-3 h-9 bg-[var(--bg)] w-72">
              <MapPin size={14} className="text-[var(--brand)] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => handleInput(e.target.value)}
                placeholder="Colonia, fraccionamiento, plaza o avenida..."
                className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
              {searching
                ? <Loader2 size={14} className="animate-spin text-[var(--text-muted)] shrink-0" />
                : input && <button type="button" onClick={() => handleInput("")} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={14} /></button>
              }
            </div>

            {/* Hint */}
            {input.trim().length === 0 && (
              <div className="absolute top-full left-0 mt-1 w-full min-w-[320px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg px-4 py-3 z-50">
                <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
                  Escribe tu <span className="text-[var(--text-secondary)] font-medium">colonia, fraccionamiento, plaza comercial o avenida</span>.<br />
                  Ej: <span className="text-[var(--text-secondary)]">Humaya</span>, <span className="text-[var(--text-secondary)]">Tres Ríos</span>, <span className="text-[var(--text-secondary)]">Plaza Forum</span>, <span className="text-[var(--text-secondary)]">Blvd. Enrique Félix Castro</span>
                </p>
              </div>
            )}

            {/* Dropdown de sugerencias */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-full min-w-[340px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-50">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="w-full text-left px-4 py-3 flex items-start gap-2.5 hover:bg-[var(--bg)] transition-colors border-b border-[var(--border)] last:border-0"
                  >
                    <MapPin size={14} className="text-[var(--brand)] shrink-0 mt-0.5" />
                    <span className="text-[13px] text-[var(--text-primary)] leading-snug">{s.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Sin resultados — solo cuando terminó de buscar y no hay nada */}
            {!searching && input.trim().length >= 5 && suggestions.length === 0 && (
              <div className="absolute top-full left-0 mt-1 w-full min-w-[300px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg px-4 py-3 z-50">
                <span className="text-[13px] text-[var(--text-muted)]">Sin resultados. Prueba con el nombre del fraccionamiento o colonia.</span>
              </div>
            )}

            {/* Botón cancelar */}
            <button
              type="button"
              onClick={cancel}
              className="absolute -right-7 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={openEdit}
            className="kupi-link flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)] shrink-0 max-w-[200px]"
            title="Cambiar dirección de entrega"
          >
            <MapPin size={15} className="text-[var(--brand)] shrink-0" />
            <span className="truncate">{location.label}</span>
          </button>
        )}

        {/* Toggle de paleta */}
        <ThemeToggle />

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-[var(--brand-tint)] flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-[var(--brand)]">JG</span>
        </div>
      </div>
    </nav>
  );
}
