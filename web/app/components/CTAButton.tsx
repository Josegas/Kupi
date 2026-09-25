import { ArrowRight } from "lucide-react";

interface Props {
  platform: string;
  total: number;
  href: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  rappi: "Rappi",
  ubereats: "Uber Eats",
  didi: "DiDi Food",
};

export default function CTAButton({ platform, total, href }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] px-6 py-4">
      <div className="max-w-6xl mx-auto">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="kupi-btn flex items-center justify-center gap-2 w-full h-13 rounded-2xl bg-[var(--savings)] text-white text-[15px] font-bold shadow-[0_4px_12px_rgba(21,128,61,0.25)] select-none"
        >
          Ir a {PLATFORM_LABELS[platform] ?? platform} · ${total.toFixed(2)}
          <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
}
