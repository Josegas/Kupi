"use client";
import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [isNoche, setIsNoche] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isNoche ? "noche" : "");
  }, [isNoche]);

  return (
    <button
      onClick={() => setIsNoche(!isNoche)}
      className="shrink-0 flex items-center gap-1.5 text-[12px] font-semibold px-3 h-7 rounded-full border border-[var(--border)] text-[var(--text-muted)] transition-colors"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <span>{isNoche ? "☀" : "🌙"}</span>
      {isNoche ? "Día claro" : "Noche"}
    </button>
  );
}
