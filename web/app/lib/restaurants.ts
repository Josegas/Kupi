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
  {
    id: "pizza-hut-culiacan",
    name: "Pizza Hut",
    cuisine: "Pizza",
    rating: 4.3,
    platforms: 2,
    fromPrice: 159,
    imageUrl: "https://images.rappi.com.mx/restaurants_background/2wsx-1790367977770.jpg",
    rappi_store_id: "1923220069",
    ubereats_store_id: "e53caf1b-90b4-4c47-a0e0-6b8f63f65337",
  },
  {
    id: "pizzeta-culiacan",
    name: "Pizzeta",
    cuisine: "Pizza",
    rating: 4.4,
    platforms: 2,
    fromPrice: 99,
    imageUrl: "https://images.rappi.com.mx/restaurants_background/phr-p1-mx-1923219267.png",
    rappi_store_id: "1923214369",
    ubereats_store_id: "800cdf3a-43c7-4bec-936e-a11d978b2143",
  },
  {
    id: "dominos-culiacan",
    name: "Domino's Pizza",
    cuisine: "Pizza",
    rating: 4.2,
    platforms: 2,
    fromPrice: 149,
    imageUrl: "https://images.rappi.com.mx/restaurants_background/portadasuprema-1787700477942.jpg",
    rappi_store_id: "1930069672",
    ubereats_store_id: "cdc441e1-fca8-563c-bea6-d76717f401f9",
  },
];
