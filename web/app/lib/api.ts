const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
  rappi_toppings?: object[];
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
