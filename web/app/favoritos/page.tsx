"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Heart, Trash2, Bell, BellOff, TrendingDown, TrendingUp, Minus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import KupiLogo from "../components/KupiLogo";
import { useAuth } from "../lib/auth";
import { proxyImage } from "../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Favorite {
  id: number;
  product_name: string;
  restaurant_name: string;
  rappi_product_id: string | null;
  ubereats_product_id: string | null;
  rappi_store_id: string | null;
  ubereats_store_id: string | null;
  image_url: string;
  created_at: string;
}

interface PriceSnapshot {
  platform: string;
  total: number;
  product_price: number;
  delivery_fee: number;
  service_fee: number;
  sampled_at: string;
}

interface Alert {
  id: number;
  favorite_id: number;
  alert_type: string;
  threshold_pct: number;
  is_active: boolean;
}

export default function FavoritosPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFav, setSelectedFav] = useState<number | null>(null);
  const [history, setHistory] = useState<PriceSnapshot[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    loadData();
  }, [user, authLoading]);

  const headers = () => ({
    Authorization: `Bearer ${session!.access_token}`,
    "Content-Type": "application/json",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [favsRes, alertsRes] = await Promise.allSettled([
        fetch(`${API_URL}/favorites`, { headers: headers() }),
        fetch(`${API_URL}/alerts`, { headers: headers() }),
      ]);
      if (favsRes.status === "fulfilled" && favsRes.value.ok) {
        setFavorites(await favsRes.value.json());
      }
      if (alertsRes.status === "fulfilled" && alertsRes.value.ok) {
        setAlerts(await alertsRes.value.json());
      }
    } catch { /* silencioso */ }
    setLoading(false);
  };

  const removeFavorite = async (id: number) => {
    await fetch(`${API_URL}/favorites/${id}`, { method: "DELETE", headers: headers() });
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    setAlerts((prev) => prev.filter((a) => a.favorite_id !== id));
    if (selectedFav === id) {
      setSelectedFav(null);
      setHistory([]);
    }
  };

  const toggleAlert = async (favId: number) => {
    const existing = alerts.find((a) => a.favorite_id === favId);
    if (existing) {
      // Toggle active/inactive
      const resp = await fetch(`${API_URL}/alerts/${existing.id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ is_active: !existing.is_active }),
      });
      if (resp.ok) {
        const updated = await resp.json();
        setAlerts((prev) => prev.map((a) => (a.id === existing.id ? updated : a)));
      }
    } else {
      // Crear nueva alerta
      const resp = await fetch(`${API_URL}/alerts`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ favorite_id: favId, alert_type: "price_drop", threshold_pct: 5 }),
      });
      if (resp.ok) {
        const created = await resp.json();
        setAlerts((prev) => [...prev, created]);
      }
    }
  };

  const loadHistory = async (favId: number) => {
    if (selectedFav === favId) {
      setSelectedFav(null);
      setHistory([]);
      return;
    }
    setSelectedFav(favId);
    setLoadingHistory(true);
    try {
      const resp = await fetch(`${API_URL}/favorites/${favId}/history?days=7`, { headers: headers() });
      setHistory(await resp.json());
    } catch {
      setHistory([]);
    }
    setLoadingHistory(false);
  };

  if (authLoading || (!user && !authLoading)) {
    return <div className="min-h-screen bg-[var(--bg)]" />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/buscar" className="kupi-link text-[var(--text-secondary)]">
            <ArrowLeft size={20} />
          </Link>
          <Link href="/buscar" className="shrink-0">
            <KupiLogo size={110} imageSrc="/Kupilogo6.png" />
          </Link>
          <div className="w-px h-6 bg-[var(--border)]" />
          <h1 className="text-[16px] font-semibold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
            Mis favoritos
          </h1>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-[var(--surface)] border border-[var(--border)] animate-pulse h-28" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={40} className="text-[var(--text-muted)] mx-auto mb-4" />
            <h2 className="text-[18px] font-semibold text-[var(--text-primary)] mb-2">Sin favoritos todavia</h2>
            <p className="text-[14px] text-[var(--text-muted)] mb-6">
              Busca un restaurante, elige un producto y toca el corazon para guardarlo
            </p>
            <Link
              href="/buscar"
              className="kupi-btn inline-block bg-[var(--brand)] text-white font-semibold text-[14px] rounded-xl px-6 py-3"
            >
              Buscar restaurantes
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {favorites.map((fav) => {
              const alert = alerts.find((a) => a.favorite_id === fav.id);
              const isExpanded = selectedFav === fav.id;
              return (
                <div key={fav.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                  {/* Card principal */}
                  <div className="flex items-center gap-4 p-4">
                    {/* Imagen */}
                    <div className="w-16 h-16 rounded-lg bg-[var(--bg)] overflow-hidden shrink-0">
                      {fav.image_url ? (
                        <img src={proxyImage(fav.image_url)} alt={fav.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-[10px]">Sin img</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{fav.product_name}</p>
                      <p className="text-[12px] text-[var(--text-muted)] truncate">{fav.restaurant_name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {fav.rappi_store_id && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#FF441F22", color: "#FF441F" }}>Rappi</span>
                        )}
                        {fav.ubereats_store_id && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#06C16722", color: "#06C167" }}>Uber Eats</span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => loadHistory(fav.id)}
                        className={`p-2 rounded-lg transition-colors ${isExpanded ? "bg-[var(--brand)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--bg)]"}`}
                        title="Ver historial de precios"
                      >
                        {isExpanded ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                      </button>
                      <button
                        onClick={() => toggleAlert(fav.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          alert?.is_active ? "bg-[var(--savings)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--bg)]"
                        }`}
                        title={alert?.is_active ? "Desactivar alerta" : "Activar alerta de precio"}
                      >
                        {alert?.is_active ? <Bell size={16} /> : <BellOff size={16} />}
                      </button>
                      <button
                        onClick={() => removeFavorite(fav.id)}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        title="Quitar de favoritos"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Historial expandido */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border)] p-4 bg-[var(--bg)]">
                      {loadingHistory ? (
                        <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                          <div className="w-4 h-4 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                          Cargando historial...
                        </div>
                      ) : history.length === 0 ? (
                        <p className="text-[13px] text-[var(--text-muted)]">
                          Sin datos de historial todavia. Los precios se registran cada 6 horas.
                        </p>
                      ) : (
                        <div>
                          <p className="text-[12px] font-semibold text-[var(--text-secondary)] mb-3">Historial de precios (7 dias)</p>
                          <div className="flex flex-col gap-2">
                            {history.slice(-10).map((s, i) => {
                              const prev = i > 0 ? history[i - 1] : null;
                              const diff = prev ? s.total - prev.total : 0;
                              return (
                                <div key={i} className="flex items-center justify-between text-[13px]">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{ background: s.platform === "rappi" ? "#FF441F" : "#06C167" }}
                                    />
                                    <span className="text-[var(--text-muted)]">
                                      {new Date(s.sampled_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-[var(--text-primary)]">${s.total.toFixed(0)}</span>
                                    {diff !== 0 && (
                                      <span className={`flex items-center gap-0.5 text-[11px] font-bold ${diff < 0 ? "text-[var(--savings)]" : "text-red-500"}`}>
                                        {diff < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                                        ${Math.abs(diff).toFixed(0)}
                                      </span>
                                    )}
                                    {diff === 0 && prev && (
                                      <span className="flex items-center gap-0.5 text-[11px] text-[var(--text-muted)]">
                                        <Minus size={12} />
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
