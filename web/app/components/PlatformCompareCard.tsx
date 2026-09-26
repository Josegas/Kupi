import { ArrowRight } from "lucide-react";

interface Props {
  platform: string;
  productPrice: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  etaMinutes?: number;
  storeName?: string;
  storeAddress?: string;
  isCheapest: boolean;
  approximate?: boolean;
  onSelect: () => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  rappi: "Rappi",
  ubereats: "Uber Eats",
  didi: "DiDi Food",
};

const PLATFORM_COLORS: Record<string, string> = {
  rappi: "#FF441F",
  ubereats: "#06C167",
  didi: "#FF6600",
};

export default function PlatformCompareCard({
  platform,
  productPrice,
  deliveryFee,
  serviceFee,
  total,
  etaMinutes,
  storeName,
  storeAddress,
  isCheapest,
  approximate,
  onSelect,
}: Props) {
  return (
    <div
      onClick={onSelect}
      className={`compare-card kupi-card cursor-pointer rounded-2xl border p-5 flex flex-col gap-4 transition-colors duration-300 ${
        isCheapest
          ? "bg-[var(--savings-tint)] border-[var(--savings)] border-[1.5px]"
          : "bg-[var(--surface)] border-[var(--border)]"
      }`}
    >
      {/* Header plataforma */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: PLATFORM_COLORS[platform] }}
          />
          <span className="text-[15px] font-semibold text-[var(--text-primary)]">
            {PLATFORM_LABELS[platform]}
          </span>
          {etaMinutes && (
            <span className="text-[12px] text-[var(--text-muted)]">{etaMinutes} min</span>
          )}
        </div>
        {isCheapest && (
          <span className="badge-cheapest text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--savings)] text-white">
            Más barato
          </span>
        )}
      </div>

      {/* Sucursal */}
      {storeName && (
        <div className="flex flex-col gap-0.5 -mt-1">
          <span className="text-[12px] font-medium text-[var(--text-secondary)] leading-tight">{storeName}</span>
          {storeAddress && (
            <span className="text-[11px] text-[var(--text-muted)] leading-tight">{storeAddress}</span>
          )}
        </div>
      )}

      {/* Precio total */}
      <p
        className="text-[20px] font-bold"
        style={{ color: isCheapest ? "var(--savings)" : "var(--text-primary)" }}
      >
        ${total.toFixed(2)}
      </p>

      {/* Desglose */}
      <div className="flex flex-col gap-1.5 text-[13px]">
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>Producto</span>
          <span>${productPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>Envío</span>
          <span>${deliveryFee.toFixed(2)}</span>
        </div>
        {serviceFee > 0 && (
          <div className="flex justify-between text-[var(--text-secondary)]">
            <span>Cuota de servicio</span>
            <span>${serviceFee.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-[var(--border)] pt-1.5 flex justify-between font-semibold text-[var(--text-primary)]">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {approximate && (
        <p className="text-[11px] text-[var(--text-muted)] leading-snug -mt-1">
          El precio puede variar algunos pesos.{" "}
          <span className="font-medium text-[var(--text-secondary)]">
            La plataforma más barata sí es real.
          </span>
        </p>
      )}

      <button className="flex items-center justify-center gap-2 text-[13px] font-semibold text-[var(--brand)] mt-auto">
        Ver en {PLATFORM_LABELS[platform]} <ArrowRight size={14} />
      </button>
    </div>
  );
}
