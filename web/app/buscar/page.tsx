"use client";
import { Suspense, useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TopNav from "../components/TopNav";
import CategoryChips from "../components/CategoryChips";
import RestaurantCard from "../components/RestaurantCard";
import { RESTAURANTS } from "../lib/restaurants";
import { fetchStoresStatus, searchRestaurants, fetchPopularRestaurants, SearchResult, PopularRestaurant } from "../lib/api";
import { useLocation } from "../lib/location";
import { useLang } from "../lib/i18n";

export default function BuscarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)]" />}>
      <Buscar />
    </Suspense>
  );
}

function Buscar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") || "";
  const [search, setSearch] = useState(initialQ);
  const [category, setCategory] = useState("Todo");
  const [storeStatus, setStoreStatus] = useState<Record<string, boolean>>({});
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<"all" | "rappi" | "ubereats" | "both">("all");
  const { t } = useLang();
  const { location } = useLocation();

  // Search results from API
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Popular restaurants from DB
  const [popular, setPopular] = useState<PopularRestaurant[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  // Load popular restaurants on mount
  useEffect(() => {
    setLoadingPopular(true);
    fetchPopularRestaurants(location.lat, location.lng)
      .then(setPopular)
      .catch(() => {})
      .finally(() => setLoadingPopular(false));
  }, [location]);

  // Load status for hardcoded restaurants
  useEffect(() => {
    const active = RESTAURANTS.filter(r => r.available !== false);
    const rappiIds = active.map(r => r.rappi_store_id);
    const ueIds = active.map(r => r.ubereats_store_id);
    fetchStoresStatus(rappiIds, ueIds).then(data => {
      const map: Record<string, boolean> = {};
      for (const [id, s] of Object.entries(data)) map[id] = s.is_open;
      setStoreStatus(map);
    }).catch(() => {}).finally(() => setStatusLoaded(true));
  }, []);

  // Search with debounce
  const doSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      // Remove q from URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete("q");
      const qs = params.toString();
      router.replace(`/buscar${qs ? `?${qs}` : ""}`, { scroll: false });
      return;
    }
    setSearching(true);
    // Save q in URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", q);
    router.replace(`/buscar?${params.toString()}`, { scroll: false });

    searchRestaurants(q, location.lat, location.lng)
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [location, searchParams, router]);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search, doSearch]);

  // Restore search from URL on mount
  useEffect(() => {
    if (initialQ) {
      doSearch(initialQ);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (q: string) => {
    setSearch(q);
  };

  // Filter hardcoded restaurants
  const filteredHardcoded = useMemo(() => {
    return RESTAURANTS.filter((r) => {
      if (r.available === false) return false;
      const matchesCat = category === "Todo" || r.cuisine.toLowerCase() === category.toLowerCase();
      return matchesCat;
    });
  }, [category]);

  // Filter search results by platform
  const filteredSearch = useMemo(() => {
    return searchResults.filter((r) => {
      if (platformFilter === "both") return r.rappi_store_id && r.ubereats_store_id;
      if (platformFilter === "rappi") return r.rappi_store_id && !r.ubereats_store_id;
      if (platformFilter === "ubereats") return !r.rappi_store_id && r.ubereats_store_id;
      return true; // "all"
    });
  }, [searchResults, platformFilter]);

  // Filter popular by platform
  const filteredPopular = useMemo(() => {
    return popular.filter((r) => {
      if (platformFilter === "both") return r.rappi_store_id && r.ubereats_store_id;
      if (platformFilter === "rappi") return r.rappi_store_id && !r.ubereats_store_id;
      if (platformFilter === "ubereats") return !r.rappi_store_id && r.ubereats_store_id;
      return true;
    });
  }, [popular, platformFilter]);

  const isSearching = search.trim().length > 0;

  return (
    <div className="min-h-screen bg-[var(--bg)] transition-colors duration-300">
      <TopNav search={search} onSearch={handleSearch} />
      <main className="max-w-6xl mx-auto px-12 py-10">
        {/* Hero */}
        <div className="mb-8">
          <h1
            className="hero-title text-[26px] font-bold text-[var(--text-primary)] mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t.buscar.title}
          </h1>
          <p className="hero-subtitle text-[15px] text-[var(--text-secondary)]">
            {t.buscar.subtitle}
          </p>
        </div>

        {/* Platform filters */}
        <div className="flex gap-2 flex-wrap mb-4">
          {([
            { key: "all", label: "Todas" },
            { key: "both", label: "Rappi + Uber Eats" },
            { key: "rappi", label: "Solo Rappi" },
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

        {/* Categorías (solo cuando no hay búsqueda activa) */}
        {!isSearching && (
          <div className="hero-chips mb-6">
            <CategoryChips selected={category} onSelect={setCategory} />
          </div>
        )}

        {/* Search results */}
        {isSearching ? (
          <>
            {searching ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse h-64"
                  />
                ))}
              </div>
            ) : filteredSearch.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSearch.map((r, i) => {
                  const hasR = !!r.rappi_store_id;
                  const hasUE = !!r.ubereats_store_id;
                  // Build href for dynamic compare
                  let cardHref: string;
                  // Check if it exists in hardcoded list
                  const hardcoded = RESTAURANTS.find(
                    hr => hr.rappi_store_id === r.rappi_store_id || hr.ubereats_store_id === r.ubereats_store_id
                  );
                  if (hardcoded) {
                    cardHref = `/compare/${hardcoded.id}`;
                  } else {
                    const params = new URLSearchParams();
                    if (r.rappi_store_id) params.set("rappi", r.rappi_store_id);
                    if (r.ubereats_store_id) params.set("ue", r.ubereats_store_id);
                    params.set("name", r.restaurant_name);
                    cardHref = `/compare/dinamico?${params.toString()}`;
                  }
                  return (
                    <div key={`${r.rappi_store_id}-${r.ubereats_store_id}-${i}`} className="stagger-item" style={{ animationDelay: `${100 + i * 50}ms` }}>
                      <RestaurantCard
                        id={r.rappi_store_id || r.ubereats_store_id || `search-${i}`}
                        name={r.restaurant_name}
                        cuisine=""
                        rating={parseFloat(r.rating) || 0}
                        fromPrice={0}
                        platforms={hasR && hasUE ? 2 : 1}
                        imageUrl={r.image_url}
                        isOpen={true}
                        href={cardHref}
                        hasRappi={hasR}
                        hasUberEats={hasUE}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="text-[15px] text-[var(--text-muted)]">
                  {t.buscar.noResults} <span className="text-[var(--text-primary)] font-medium">&quot;{search}&quot;</span>
                </p>
                <button
                  onClick={() => { setSearch(""); }}
                  className="mt-4 text-[13px] font-semibold text-[var(--brand)] underline"
                >
                  {t.buscar.seeAll}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Popular restaurants section */}
            {filteredPopular.length > 0 && (
              <div className="mb-10">
                <h2
                  className="text-[18px] font-semibold text-[var(--text-primary)] mb-4"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Restaurantes disponibles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPopular.map((r, i) => {
                    const hasR = !!r.rappi_store_id;
                    const hasUE = !!r.ubereats_store_id;
                    const hardcoded = RESTAURANTS.find(
                      hr => hr.rappi_store_id === r.rappi_store_id || hr.ubereats_store_id === r.ubereats_store_id
                    );
                    let cardHref: string;
                    if (hardcoded) {
                      cardHref = `/compare/${hardcoded.id}`;
                    } else {
                      const params = new URLSearchParams();
                      if (r.rappi_store_id) params.set("rappi", r.rappi_store_id);
                      if (r.ubereats_store_id) params.set("ue", r.ubereats_store_id);
                      params.set("name", r.restaurant_name);
                      cardHref = `/compare/dinamico?${params.toString()}`;
                    }
                    return (
                      <div key={`pop-${r.rappi_store_id}-${r.ubereats_store_id}-${i}`} className="stagger-item" style={{ animationDelay: `${100 + i * 50}ms` }}>
                        <RestaurantCard
                          id={r.rappi_store_id || r.ubereats_store_id || `pop-${i}`}
                          name={r.restaurant_name}
                          cuisine={r.cuisine}
                          rating={0}
                          fromPrice={0}
                          platforms={hasR && hasUE ? 2 : 1}
                          imageUrl={r.image_url}
                          isOpen={r.is_open}
                          href={cardHref}
                          hasRappi={hasR}
                          hasUberEats={hasUE}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {loadingPopular && (
              <div className="mb-10">
                <h2
                  className="text-[18px] font-semibold text-[var(--text-primary)] mb-4"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Restaurantes disponibles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse h-64"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Hardcoded restaurants grid */}
            {filteredHardcoded.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHardcoded.map((r, i) => (
                  <div key={r.id} className="stagger-item" style={{ animationDelay: `${220 + i * 50}ms` }}>
                    <RestaurantCard
                      id={r.id}
                      name={r.name}
                      cuisine={r.cuisine}
                      rating={r.rating}
                      fromPrice={r.fromPrice}
                      platforms={r.platforms}
                      imageUrl={r.imageUrl}
                      isOpen={statusLoaded ? (storeStatus[r.rappi_store_id] ?? true) : undefined}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
