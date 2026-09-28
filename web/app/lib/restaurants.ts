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
  {
    id: "kfc-culiacan",
    name: "KFC",
    cuisine: "Pollo",
    rating: 4.3,
    platforms: 2,
    fromPrice: 99,
    imageUrl: "https://images.rappi.com.mx/restaurants_background/prtadakfc1222-1787610961298.jpg",
    rappi_store_id: "1923218753",
    ubereats_store_id: "ff1cda7d-6ac6-4b0f-a276-ff8e49fd63df",
  },
  {
    id: "starbucks-culiacan",
    name: "Starbucks",
    cuisine: "Café",
    rating: 4.5,
    platforms: 2,
    fromPrice: 89,
    imageUrl: "https://images.rappi.com.mx/restaurants_background/bigpumpkin-1789490816049.png",
    rappi_store_id: "1923761853",
    ubereats_store_id: "fa88c37a-8e40-43fc-a5c1-a1b288090fc1",
  },
  {
    id: "mcdonalds-culiacan",
    name: "McDonald's",
    cuisine: "Hamburguesas",
    rating: 4.2,
    platforms: 2,
    fromPrice: 99,
    imageUrl: "https://images.rappi.com.mx/restaurants_background/853f4ff8-35ef-4eeb-a09e-21c32756c50d-1789952298280.png",
    rappi_store_id: "1923235741",
    ubereats_store_id: "dd6ea249-d885-464f-a73d-8e67e62068c7",
  },
  {
    id: "taqueria-san-juan-culiacan",
    name: "Taquería San Juan",
    cuisine: "Mexicana",
    rating: 4.6,
    platforms: 2,
    fromPrice: 89,
    imageUrl: "https://images.rappi.com.mx/restaurants_background/13-1708719729357.png",
    rappi_store_id: "1923229914",
    ubereats_store_id: "1916b3b2-36c3-4a79-bdf6-7e2f97e6ded6",
  },
];
