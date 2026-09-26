"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, RefreshCw, MapPin, Search } from "lucide-react";
import Link from "next/link";
import PlatformCompareCard from "../../components/PlatformCompareCard";
import CTAButton from "../../components/CTAButton";
import { compareProducts, fetchCombinedMenu, proxyImage, QuoteResponse, CombinedProduct } from "../../lib/api";
import { RestaurantConfig } from "../../lib/restaurants";
import { useLocation } from "../../lib/location";

interface Props {
  restaurant: RestaurantConfig;
}

type Step = "selecting" | "comparing";

export default function CompareClient({ restaurant }: Props) {
  const { location } = useLocation();

  // — Paso 1: selección de producto —
  const [step, setStep] = useState<Step>("selecting");
  const [products, setProducts] = useState<CombinedProduct[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<CombinedProduct | null>(null);

  // — Paso 2: comparación de precios —
  const [quotes, setQuotes] = useState<QuoteResponse[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<QuoteResponse | null>(null);

  const loadMenu = () => {
    setLoadingMenu(true);
    setMenuError(null);
    fetchCombinedMenu(
      restaurant.rappi_store_id,
      restaurant.ubereats_store_id,
      location.lat,
      location.lng,
    )
      .then(setProducts)
      .catch((e) => setMenuError(e.message))
      .finally(() => setLoadingMenu(false));
  };

  useEffect(() => {
    loadMenu();
  }, [restaurant, location]);

  const handleSelectProduct = (product: CombinedProduct) => {
    setSelectedProduct(product);
    setStep("comparing");
    setQuotes([]);
    setQuotesError(null);
    setLoadingQuotes(true);
    compareProducts({
      rappi_store_id: restaurant.rappi_store_id,
      ubereats_store_id: restaurant.ubereats_store_id,
      rappi_product_id: product.rappi_product_id,
      ubereats_product_id: product.ubereats_product_id,
      lat: location.lat,
      lng: location.lng,
    })
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.total - b.total);
        setQuotes(sorted);
        setSelectedQuote(sorted[0] ?? null);
      })
      .catch((e) => setQuotesError(e.message))
      .finally(() => setLoadingQuotes(false));
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const cheapest = quotes[0] ?? null;

  // ── Header compartido ──────────────────────────────────────────────
  const Header = (
    <div className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-12 h-16 flex items-center gap-4">
        {step === "comparing" ? (
          <button
            onClick={() => setStep("selecting")}
            className="kupi-link text-[var(--text-secondary)] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <Link href="/" className="kupi-link text-[var(--text-secondary)] transition-colors">
            <ArrowLeft size={20} />
          </Link>
        )}
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
  );

  // ── Paso 1: selección de producto ──────────────────────────────────
  if (step === "selecting") {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        {Header}
        <div className="max-w-2xl mx-auto px-6 py-8">

          <h2
            className="text-[18px] font-semibold text-[var(--text-primary)] mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ¿Qué quieres comparar?
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mb-6">
            Solo se muestran productos disponibles en Rappi y Uber Eats.
          </p>

          {/* Buscador */}
          {!loadingMenu && !menuError && products.length > 0 && (
            <div className="kupi-input flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 mb-5 transition-all">
              <Search size={15} className="text-[var(--text-muted)] shrink-0" />
              <input
                type="text"
                placeholder="Buscar producto…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
              />
            </div>
          )}

          {/* Loading */}
          {loadingMenu && (
            <div className="flex flex-col gap-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-[var(--surface)] border border-[var(--border)] animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Error */}
          {!loadingMenu && menuError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/10 p-6 text-center">
              <p className="text-[14px] text-red-600 dark:text-red-400 mb-3">{menuError}</p>
              <button
                onClick={loadMenu}
                className="text-[13px] font-semibold text-[var(--brand)] underline"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Lista de productos */}
          {!loadingMenu && !menuError && (
            <div className="flex flex-col gap-2">
              {filteredProducts.length === 0 && (
                <p className="text-[14px] text-[var(--text-muted)] text-center py-8">
                  {search ? "Sin resultados para tu búsqueda." : "No hay productos disponibles."}
                </p>
              )}
              {filteredProducts.map((p) => (
                <button
                  key={p.rappi_product_id}
                  onClick={() => handleSelectProduct(p)}
                  className="kupi-card w-full text-left bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3 transition-colors hover:border-[var(--brand)]"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg bg-[var(--bg)] shrink-0 overflow-hidden">
                    {p.image_url ? (
                      <img src={proxyImage(p.image_url)} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--text-primary)] leading-tight truncate">
                      {p.name}
                    </p>
                    {p.description && (
                      <p className="text-[12px] text-[var(--text-muted)] leading-snug mt-0.5 line-clamp-1">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[14px] font-bold text-[var(--savings)]">
                      ${p.price.toFixed(0)}
                    </span>
                    <ArrowRight size={15} className="text-[var(--text-muted)]" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Paso 2: comparación de precios ─────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--bg)] pb-28">
      {Header}

      <div className="max-w-6xl mx-auto px-12 py-10">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Panel izquierdo: producto seleccionado */}
          <div className="lg:w-72 shrink-0">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
              <div className="h-48 bg-[var(--bg)] relative">
                {selectedProduct?.image_url ? (
                  <img
                    src={proxyImage(selectedProduct.image_url)}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : restaurant.imageUrl ? (
                  <img
                    src={restaurant.imageUrl}
                    alt={restaurant.name}
                    className="w-full h-full object-cover opacity-30"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
                    Sin imagen
                  </div>
                )}
              </div>
              <div className="p-5">
                <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-1">
                  {selectedProduct?.name}
                </h2>
                {selectedProduct?.description && (
                  <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                    {selectedProduct.description}
                  </p>
                )}
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
              {!loadingQuotes && (
                <button
                  onClick={() => selectedProduct && handleSelectProduct(selectedProduct)}
                  className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors kupi-link"
                >
                  <RefreshCw size={13} />
                  Actualizar
                </button>
              )}
            </div>

            {/* Carga */}
            {loadingQuotes && (
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
            {!loadingQuotes && quotesError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/10 p-6 text-center">
                <p className="text-[14px] text-red-600 dark:text-red-400 mb-3">{quotesError}</p>
                <button
                  onClick={() => selectedProduct && handleSelectProduct(selectedProduct)}
                  className="text-[13px] font-semibold text-[var(--brand)] underline"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Resultados */}
            {!loadingQuotes && !quotesError && quotes.length > 0 && (
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
                    approximate={q.platform === "ubereats"}
                    onSelect={() => setSelectedQuote(q)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedQuote && (
        <CTAButton
          platform={selectedQuote.platform}
          total={selectedQuote.total}
          href={selectedQuote.deep_link}
        />
      )}
    </div>
  );
}
