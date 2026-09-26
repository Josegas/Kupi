"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, MapPin } from "lucide-react";
import Link from "next/link";
import PlatformCompareCard from "../../components/PlatformCompareCard";
import CTAButton from "../../components/CTAButton";
import { compareProducts, QuoteResponse } from "../../lib/api";
import { RestaurantConfig } from "../../lib/restaurants";
import { useLocation } from "../../lib/location";

interface Props {
  restaurant: RestaurantConfig;
}

export default function CompareClient({ restaurant }: Props) {
  const { location } = useLocation();
  const [quotes, setQuotes] = useState<QuoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<QuoteResponse | null>(null);

  const fetchQuotes = () => {
    setLoading(true);
    setError(null);
    compareProducts({
      rappi_store_id: restaurant.rappi_store_id,
      ubereats_store_id: restaurant.ubereats_store_id,
      rappi_product_id: restaurant.rappi_product_id,
      ubereats_product_id: restaurant.ubereats_product_id,
      lat: location.lat,
      lng: location.lng,
      rappi_toppings: restaurant.rappi_toppings,
    })
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.total - b.total);
        setQuotes(sorted);
        setSelected(sorted[0] ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQuotes();
  }, [restaurant, location]);

  const cheapest = quotes[0] ?? null;

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-28">
      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-12 h-16 flex items-center gap-4">
          <Link href="/" className="kupi-link text-[var(--text-secondary)] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <span
              className="text-[17px] font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {restaurant.name}
            </span>
            <p className="text-[12px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
              <MapPin size={11} className="text-[var(--brand)]" />
              {location.label}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-12 py-10">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Panel izquierdo: producto */}
          <div className="lg:w-72 shrink-0">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
              <div className="h-48 bg-[var(--bg)] flex items-center justify-center text-[var(--text-muted)] text-sm">
                Sin imagen
              </div>
              <div className="p-5">
                <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-1">
                  {restaurant.product_name}
                </h2>
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                  {restaurant.product_description}
                </p>
              </div>
            </div>
          </div>

          {/* Panel derecho: comparación */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-5">
              <h3
                className="text-[16px] font-semibold text-[var(--text-secondary)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Precio final en cada plataforma
              </h3>
              {!loading && (
                <button
                  onClick={fetchQuotes}
                  className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors kupi-link"
                >
                  <RefreshCw size={13} />
                  Actualizar
                </button>
              )}
            </div>

            {/* Estado de carga */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 h-52 animate-pulse"
                  />
                ))}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/10 p-6 text-center">
                <p className="text-[14px] text-red-600 dark:text-red-400 mb-3">{error}</p>
                <button
                  onClick={fetchQuotes}
                  className="text-[13px] font-semibold text-[var(--brand)] underline"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Resultados */}
            {!loading && !error && quotes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quotes.map((q) => (
                  <PlatformCompareCard
                    key={q.platform}
                    platform={q.platform}
                    productPrice={q.product_price}
                    deliveryFee={q.delivery_fee}
                    serviceFee={q.service_fee}
                    total={q.total}
                    etaMinutes={q.eta_minutes ?? undefined}
                    storeName={q.store_name}
                    storeAddress={q.store_address}
                    isCheapest={cheapest !== null && q.platform === cheapest.platform}
                    onSelect={() => setSelected(q)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA fijo abajo */}
      {selected && (
        <CTAButton
          platform={selected.platform}
          total={selected.total}
          href={selected.deep_link}
        />
      )}
    </div>
  );
}
