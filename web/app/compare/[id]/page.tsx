import { MOCK_RESTAURANTS } from "../../lib/mock";
import CompareClient from "./CompareClient";

export function generateStaticParams() {
  return MOCK_RESTAURANTS.map((r) => ({ id: r.id }));
}

export default function ComparePage() {
  return <CompareClient />;
}
