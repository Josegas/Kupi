import { Star } from "lucide-react";
import Link from "next/link";

interface Props {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  fromPrice: number;
  platforms: number;
  imageUrl?: string;
}

export default function RestaurantCard({ id, name, cuisine, rating, fromPrice, platforms, imageUrl }: Props) {
  return (
    <Link href={`/compare/${id}`}>
    <div className="kupi-card bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden cursor-pointer shadow-[0_1px_3px_rgba(31,35,35,0.05)]">
      {/* Imagen */}
      <div className="h-36 bg-[var(--bg)] relative">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs">
            Sin imagen
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[16px] font-bold text-[var(--text-primary)] leading-tight">{name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[13px] text-[var(--text-secondary)]">{cuisine}</span>
              <span className="text-[var(--text-muted)]">·</span>
              <Star size={12} fill="var(--brand)" stroke="none" />
              <span className="text-[13px] text-[var(--text-secondary)]">{rating.toFixed(1)}</span>
            </div>
          </div>
          <span className="shrink-0 text-[12px] font-semibold px-2.5 py-1 rounded-full bg-[var(--brand-tint)] text-[var(--brand)]">
            {platforms} apps
          </span>
        </div>

        <p className="text-[15px] font-bold text-[var(--savings)]">
          Desde ${fromPrice.toFixed(0)}
        </p>
      </div>
    </div>
    </Link>
  );
}
