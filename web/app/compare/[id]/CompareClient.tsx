"use client";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import PlatformCompareCard from "../../components/PlatformCompareCard";
import CTAButton from "../../components/CTAButton";
import { MOCK_COMPARE } from "../../lib/mock";

export default function CompareClient() {
  const data = MOCK_COMPARE;
  const sorted = [...data.quotes].sort((a, b) => a.total - b.total);
  const cheapest = sorted[0];
  const [selected, setSelected] = useState(cheapest);

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-28">
      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-12 h-16 flex items-center gap-4">
          <Link href="/" className="kupi-link text-[var(--text-secondary)] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <span
            className="text-[17px] font-semibold text-[var(--text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {data.restaurant}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-12 py-10">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Panel izquierdo: producto */}
          <div className="lg:w-72 shrink-0">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
              <div className="h-48 bg-[var(--bg)] flex items-center justify-center text-[var(--text-muted)] text-sm">
                Sin imagen
              </div>
              <div className="p-5">
                <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-1">
                  {data.product.name}
                </h2>
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                  {data.product.description}
                </p>
              </div>
            </div>
          </div>

          {/* Panel derecho: comparación */}
          <div className="flex-1">
            <h3
              className="text-[16px] font-semibold text-[var(--text-secondary)] mb-5"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Precio final en cada plataforma
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sorted.map((q) => (
                <PlatformCompareCard
                  key={q.platform}
                  {...q}
                  isCheapest={q.platform === cheapest.platform}
                  onSelect={() => setSelected(q)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA fijo abajo */}
      <CTAButton
        platform={selected.platform}
        total={selected.total}
        href={selected.deepLink}
      />
    </div>
  );
}
