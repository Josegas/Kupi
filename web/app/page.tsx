import TopNav from "./components/TopNav";
import CategoryChips from "./components/CategoryChips";
import RestaurantCard from "./components/RestaurantCard";
import { MOCK_RESTAURANTS } from "./lib/mock";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <TopNav />
      <main className="max-w-6xl mx-auto px-12 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-[26px] font-bold text-[var(--text-primary)] mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ¿Qué se te antoja hoy?
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)]">
            Compara precios reales en Rappi, Uber Eats y DiDi Food — elige siempre el más barato.
          </p>
        </div>

        {/* Categorías */}
        <div className="mb-8">
          <CategoryChips />
        </div>

        {/* Grid de restaurantes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_RESTAURANTS.map((r) => (
            <RestaurantCard key={r.id} {...r} />
          ))}
        </div>
      </main>
    </div>
  );
}
