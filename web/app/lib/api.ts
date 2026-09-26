const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function proxyImage(url: string): string {
  if (!url) return "";
  return `${API_URL}/proxy/image?url=${encodeURIComponent(url)}`;
}

export interface QuoteResponse {
  platform: string;
  product_price: number;
  delivery_fee: number;
  service_fee: number;
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
}

export interface CombinedProduct {
  name: string;
  description: string;
  price: number;
  image_url: string;
  rappi_product_id: string;
  ubereats_product_id: string;
}

export async function fetchCombinedMenu(
  rappi_store_id: string,
  ubereats_store_id: string,
  lat?: number,
  lng?: number,
): Promise<CombinedProduct[]> {
  const params = new URLSearchParams({ rappi_store_id, ubereats_store_id });
  if (lat !== undefined) params.set("lat", String(lat));
  if (lng !== undefined) params.set("lng", String(lng));
  const res = await fetch(`${API_URL}/menu/combined?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Error ${res.status}`);
  }
  const data = await res.json();
  return data.products as CombinedProduct[];
}

export async function compareProducts(req: CompareRequest): Promise<QuoteResponse[]> {
  const res = await fetch(`${API_URL}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Error ${res.status}`);
  }
  return res.json();
}
