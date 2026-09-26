import TopNav from "./components/TopNav";
import CategoryChips from "./components/CategoryChips";
import RestaurantCard from "./components/RestaurantCard";
import { RESTAURANTS } from "./lib/restaurants";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg)] transition-colors duration-300">
      <TopNav />
      <main className="max-w-6xl mx-auto px-12 py-10">
        {/* Hero */}
        <div className="mb-8">
          <h1
            className="hero-title text-[26px] font-bold text-[var(--text-primary)] mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ¿Qué se te antoja hoy?
          </h1>
          <p className="hero-subtitle text-[15px] text-[var(--text-secondary)]">
            Ve el precio final en Rappi, Uber Eats y DiDi Food antes de pedir. Sin sorpresas.
          </p>
        </div>

        {/* Categorías */}
        <div className="hero-chips mb-8">
          <CategoryChips />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {RESTAURANTS.map((r) => (
            <div key={r.id} className="stagger-item">
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
      </main>
    </div>
  );
}
