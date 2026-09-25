"use client";
import { useState } from "react";

const CATEGORIES = ["Todo", "Pizza", "Hamburguesas", "Tacos", "Sushi", "Pollo", "Postres", "Café"];

export default function CategoryChips() {
  const [selected, setSelected] = useState("Todo");

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => setSelected(cat)}
          className={`shrink-0 px-4 h-8 rounded-full text-[13px] font-semibold border active:scale-95 transition-[transform,colors] duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] ${
            selected === cat
              ? "bg-[var(--brand)] text-white border-[var(--brand)]"
              : "bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
