"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, RefreshCw, MapPin, Search } from "lucide-react";
import Link from "next/link";
import PlatformCompareCard from "../../components/PlatformCompareCard";
import CTAButton from "../../components/CTAButton";
import { compareProducts, fetchCombinedMenu, proxyImage, QuoteResponse, CombinedProduct, ExclusiveProduct } from "../../lib/api";
import { RestaurantConfig } from "../../lib/restaurants";
import { useLocation } from "../../lib/location";
import { useLang } from "../../lib/i18n";

interface Props {
  restaurant: RestaurantConfig;
}

type Step = "selecting" | "comparing" | "exclusive";

interface ListProduct {
  name: string;
  description?: string;
  price: number;
  image_url: string;
  rappi_product_id?: string;
  ubereats_product_id?: string;
  didi_product_id?: string | null;
  exclusivePlatform?: "rappi" | "ubereats";
}

export default function CompareClient({ restaurant }: Props) {
  const { location } = useLocation();
  const { t } = useLang();

  // — Paso 1: selección de producto —
  const [step, setStep] = useState<Step>("selecting");
  const [allProducts, setAllProducts] = useState<ListProduct[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "both" | "rappi" | "ubereats">("all");
  const [selectedProduct, setSelectedProduct] = useState<ListProduct | null>(null);

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
      .then((data) => {
        const matched: ListProduct[] = data.products.map((p) => ({ ...p }));
        const exclusive: ListProduct[] = [
          ...data.only_rappi.map((p) => ({ ...p, exclusivePlatform: "rappi" as const })),
          ...data.only_ubereats.map((p) => ({ ...p, exclusivePlatform: "ubereats" as const })),
        ];
        const merged = [...matched, ...exclusive].sort((a, b) => a.price - b.price);
        setAllProducts(merged);
      })
      .catch((e) => setMenuError(e.message))
      .finally(() => setLoadingMenu(false));
  };

  useEffect(() => {
    loadMenu();
  }, [restaurant, location]);

  const handleSelectProduct = (product: ListProduct) => {
    setSelectedProduct(product);
    setStep("comparing");
    setQuotes([]);
    setQuotesError(null);
    setLoadingQuotes(true);
    compareProducts({
      rappi_store_id: restaurant.rappi_store_id,
      ubereats_store_id: restaurant.ubereats_store_id,
      rappi_product_id: product.rappi_product_id ?? "none",
      ubereats_product_id: product.ubereats_product_id ?? "none",
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

  const filteredProducts = allProducts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesPlatform =
      platformFilter === "all" ||
      (platformFilter === "both" && !p.exclusivePlatform) ||
      (platformFilter === "rappi" && p.exclusivePlatform === "rappi") ||
      (platformFilter === "ubereats" && p.exclusivePlatform === "ubereats");
    return matchesSearch && matchesPlatform;
  });

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
          <Link href="/buscar" className="kupi-link text-[var(--text-secondary)] transition-colors">
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
        <div className="compare-step max-w-2xl mx-auto px-6 py-8">

          <h2
            className="text-[18px] font-semibold text-[var(--text-primary)] mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t.compare.selectTitle}
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mb-6">
            {t.compare.selectSubtitle}
          </p>

          {/* Filtros de plataforma */}
          {!loadingMenu && !menuError && allProducts.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {([
                { key: "all",      label: "Todo" },
                { key: "both",     label: "Ambas apps" },
                { key: "rappi",    label: "Solo Rappi" },
                { key: "ubereats", label: "Solo Uber Eats" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPlatformFilter(key)}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors"
                  style={
                    platformFilter === key
                      ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" }
                      : { background: "var(--surface)", color: "var(--text-secondary)", borderColor: "var(--border)" }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Buscador */}
          {!loadingMenu && !menuError && allProducts.length > 0 && (
            <div className="kupi-input flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 mb-5 transition-all">
              <Search size={15} className="text-[var(--text-muted)] shrink-0" />
              <input
                type="text"
                placeholder={t.compare.searchPlaceholder}
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
                {t.compare.retry}
              </button>
            </div>
          )}

          {/* Lista de productos */}
          {!loadingMenu && !menuError && (
            <div className="flex flex-col gap-2">
              {filteredProducts.length === 0 && (
                <p className="text-[14px] text-[var(--text-muted)] text-center py-8">
                  {search ? t.compare.noSearchResults : t.compare.noProducts}
                </p>
              )}
              {filteredProducts.map((p, i) => {
                const PLATFORM_COLORS: Record<string, string> = { rappi: "#FF441F", ubereats: "#06C167" };
                const PLATFORM_LABELS: Record<string, string> = { rappi: "Rappi", ubereats: "Uber Eats" };
                return (
                  <button
                    key={p.rappi_product_id ?? p.ubereats_product_id}
                    onClick={() => handleSelectProduct(p)}
                    className={`kupi-card w-full text-left bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3 transition-colors hover:border-[var(--brand)]${!search ? " stagger-product" : ""}`}
                    style={!search ? { animationDelay: `${Math.min(i * 38, 220)}ms` } : undefined}
                  >
                    <div className="w-14 h-14 rounded-lg bg-[var(--bg)] shrink-0 overflow-hidden">
                      {p.image_url ? (
                        <img src={proxyImage(p.image_url)} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--text-primary)] leading-tight truncate">{p.name}</p>
                      {p.exclusivePlatform ? (
                        <span
                          className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1"
                          style={{ background: PLATFORM_COLORS[p.exclusivePlatform] + "22", color: PLATFORM_COLORS[p.exclusivePlatform] }}
                        >
                          Solo en {PLATFORM_LABELS[p.exclusivePlatform]}
                        </span>
                      ) : p.description ? (
                        <p className="text-[12px] text-[var(--text-muted)] leading-snug mt-0.5 line-clamp-1">{p.description}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[14px] font-bold text-[var(--savings)]">${p.price.toFixed(0)}</span>
                      <ArrowRight size={15} className="text-[var(--text-muted)]" />
                    </div>
                  </button>
                );
              })}
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

      <div className="compare-step max-w-6xl mx-auto px-12 py-10">
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
                    {t.compare.noImage}
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
                {t.compare.priceTitle}
              </h3>
              {!loadingQuotes && (
                <button
                  onClick={() => selectedProduct && handleSelectProduct(selectedProduct)}
                  className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors kupi-link"
                >
                  <RefreshCw size={13} />
                  {t.compare.refresh}
                </button>
              )}
            </div>

            {/* Carga */}
            {loadingQuotes && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: "Rappi", color: "#FF441F" },
                  { name: "Uber Eats", color: "#06C167" },
                ].map((p) => (
                  <div
                    key={p.name}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-4"
                  >
                    {/* Header visible con branding de la plataforma */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full animate-pulse"
                        style={{ background: p.color }}
                      />
                      <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                        {p.name}
                      </span>
                    </div>

                    {/* Precio grande en placeholder */}
                    <div className="flex items-end gap-1">
                      <div className="h-8 w-28 rounded-lg bg-[var(--bg)] animate-pulse" />
                    </div>

                    {/* Líneas de desglose */}
                    <div className="flex flex-col gap-2 pt-1 border-t border-[var(--border)]">
                      {[80, 60, 48].map((w, i) => (
                        <div
                          key={i}
                          className="h-3 rounded-full bg-[var(--bg)] animate-pulse"
                          style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }}
                        />
                      ))}
                    </div>

                    {/* Status */}
                    <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ background: p.color, animationDuration: "1s" }}
                      />
                      {t.compare.checking}
                    </p>
                  </div>
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
                  {t.compare.retry}
                </button>
              </div>
            )}

            {/* Aviso producto exclusivo */}
            {!loadingQuotes && !quotesError && quotes.length === 1 && selectedProduct?.exclusivePlatform && (
              <div className="mb-4 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[13px] text-[var(--text-secondary)]">
                Este producto solo está disponible en{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {{ rappi: "Rappi", ubereats: "Uber Eats" }[selectedProduct.exclusivePlatform]}
                </span>
                , por lo que no se puede comparar con otras plataformas.
              </div>
            )}

            {/* Resultados */}
            {!loadingQuotes && !quotesError && quotes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quotes.map((q, i) => (
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
                    isCheapest={quotes.length > 1 && cheapest !== null && q.platform === cheapest.platform}
                    approximate={q.platform === "ubereats"}
                    cardIndex={i}
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
