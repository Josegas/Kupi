"use client";
import { useState, useMemo } from "react";
import TopNav from "../components/TopNav";
import CategoryChips from "../components/CategoryChips";
import RestaurantCard from "../components/RestaurantCard";
import { RESTAURANTS } from "../lib/restaurants";
import { useLang } from "../lib/i18n";

export default function Buscar() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todo");
  const { t } = useLang();

  const filtered = useMemo(() => {
    return RESTAURANTS.filter((r) => {
      const matchesCat = category === "Todo" || r.cuisine.toLowerCase() === category.toLowerCase();
      const q = search.toLowerCase();
      const matchesSearch = !q || r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [search, category]);

  return (
    <div className="min-h-screen bg-[var(--bg)] transition-colors duration-300">
      <TopNav search={search} onSearch={setSearch} />
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

        {/* Categorías */}
        <div className="hero-chips mb-8">
          <CategoryChips selected={category} onSelect={setCategory} />
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((r, i) => (
              <div key={r.id} className="stagger-item" style={{ animationDelay: `${220 + i * 50}ms` }}>
                <RestaurantCard
                  id={r.id}
                  name={r.name}
                  cuisine={r.cuisine}
                  rating={r.rating}
                  fromPrice={r.fromPrice}
                  platforms={r.platforms}
                  imageUrl={r.imageUrl}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-[15px] text-[var(--text-muted)]">
              {t.buscar.noResults} <span className="text-[var(--text-primary)] font-medium">"{search || category}"</span>
            </p>
            <button
              onClick={() => { setSearch(""); setCategory("Todo"); }}
              className="mt-4 text-[13px] font-semibold text-[var(--brand)] underline"
            >
              {t.buscar.seeAll}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
