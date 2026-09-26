export interface RestaurantConfig {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  platforms: number;
  fromPrice: number;
  imageUrl?: string;
  rappi_store_id: string;
  ubereats_store_id: string;
}

export const RESTAURANTS: RestaurantConfig[] = [
  {
    id: "little-caesars-culiacan",
    name: "Little Caesars",
    cuisine: "Pizza",
    rating: 4.5,
    platforms: 2,
    fromPrice: 189,
    imageUrl: "https://images.rappi.com.mx/restaurants_background/portalc1-1786746490598.jpg",
    rappi_store_id: "1923772704",
    ubereats_store_id: "793b1eae-e077-44d0-8744-cf23f54fec50",
  },
];
