import { RESTAURANTS } from "../../lib/restaurants";
import CompareClient from "./CompareClient";

export function generateStaticParams() {
  return RESTAURANTS.map((r) => ({ id: r.id }));
}

export default async function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurant = RESTAURANTS.find((r) => r.id === id);
  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--text-secondary)]">
        Restaurante no encontrado
      </div>
    );
  }
  return <CompareClient restaurant={restaurant} />;
}
