const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function proxyImage(url: string): string {
  if (!url) return "";
  return `${API_URL}/proxy/image?url=${encodeURIComponent(url)}`;
}

export interface QuoteResponse {
  platform: string;
  product_price: number;
  delivery_fee: number | null; // null en DiDi (solo disponible en la app)
  service_fee: number | null;  // null en DiDi (solo disponible en la app)
  total: number;
  currency: string;
  eta_minutes: number | null;
  deep_link: string;
  store_name: string;
  store_address: string;
}

export interface CompareRequest {
  rappi_store_id: string;
  ubereats_store_id: string;
  rappi_product_id: string;
  ubereats_product_id: string;
  lat?: number;
  lng?: number;
  // DiDi es opcional: omitir si la sucursal no está en el catálogo
  didi_store_id?: string | null;
  didi_product_id?: string | null;
}

export interface CombinedProduct {
  name: string;
  description: string;
  price: number;
  image_url: string;
  rappi_product_id: string;
  ubereats_product_id: string;
  didi_product_id?: string | null;
}

export interface ExclusiveProduct {
  name: string;
  description: string;
  price: number;
  image_url: string;
  platform: "rappi" | "ubereats";
  rappi_product_id?: string;
  ubereats_product_id?: string;
}

export interface CombinedMenuResponse {
  products: CombinedProduct[];
  only_rappi: ExclusiveProduct[];
  only_ubereats: ExclusiveProduct[];
}

function parseDetail(detail: unknown, status: number): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((d) => (typeof d?.msg === "string" ? d.msg : JSON.stringify(d)));
    return msgs.join(", ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return `Error ${status}`;
}

export async function fetchCombinedMenu(
  rappi_store_id: string,
  ubereats_store_id: string,
  lat?: number,
  lng?: number,
  didi_store_id?: string | null,
): Promise<CombinedMenuResponse> {
  const params = new URLSearchParams({ rappi_store_id, ubereats_store_id });
  if (lat !== undefined) params.set("lat", String(lat));
  if (lng !== undefined) params.set("lng", String(lng));
  if (didi_store_id) params.set("didi_store_id", didi_store_id);
  const res = await fetch(`${API_URL}/menu/combined?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseDetail(body?.detail, res.status));
  }
  return res.json() as Promise<CombinedMenuResponse>;
}

export async function compareProducts(req: CompareRequest): Promise<QuoteResponse[]> {
  const res = await fetch(`${API_URL}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseDetail(body?.detail, res.status));
  }
  return res.json();
}
