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
  // DiDi Food: ID numérico de la sucursal en stores.json.
  // null = sucursal no disponible en DiDi o branch no confirmada.
  didi_store_id: string | null;
  // false = restaurante cerrado permanentemente o suspendido; se oculta del listado.
  // undefined/true = disponible normalmente.
  available?: boolean;
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
    didi_store_id: "5764607637052981505", // Little Caesars (Humaya 034) — confirmado
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
    didi_store_id: "5764607606770106625", // Pizza Hut (TEC 1358) — misma dirección "Juan De Dios Batiz / TEC"
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
    didi_store_id: "5764607689536307461", // Pizzeta (Abastos) — más cercana a Primer Cuadro/centro
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
    didi_store_id: "5764607616127598850", // Domino's Pizza (La Primavera) — única sucursal en DiDi Culiacán
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
    didi_store_id: null, // Blvd. Sánchez Alonso no coincide con ningún nombre de sucursal DiDi
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
    didi_store_id: "5764607529452306696", // Starbucks (Tres Ríos Culiacán) — misma dirección "Blvd. Francisco Labastida / Tres Ríos"
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
    didi_store_id: "5764607693478953218", // McDonald's (Culiacán) — De Los Insurgentes / C.P. 80000 = centro, no Sendero
  },
  {
    id: "sushi-city-culiacan",
    name: "Sushi City",
    cuisine: "Sushi",
    rating: 4.7,
    platforms: 2,
    fromPrice: 89,
    imageUrl: "https://images.rappi.com.mx/restaurants_background/phr-p1-mx-1930209629.png",
    rappi_store_id: "1930209629",       // Sucursal Hidalgo
    ubereats_store_id: "2ef66044-c618-440c-8775-4fb2f2bfd9fb", // Sucursal Tierra Blanca
    didi_store_id: null,
  },
  {
    id: "taqueria-san-juan-culiacan",
    name: "Taquería San Juan",
    cuisine: "Tacos",
    rating: 4.6,
    platforms: 2,
    fromPrice: 89,
    imageUrl: "https://images.rappi.com.mx/restaurants_background/13-1708719729357.png",
    rappi_store_id: "1923229914",
    ubereats_store_id: "1916b3b2-36c3-4a79-bdf6-7e2f97e6ded6",
    didi_store_id: null, // No aparece en el catálogo de DiDi Culiacán (100 sucursales revisadas)
  },
];
