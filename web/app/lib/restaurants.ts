export interface RappiTopping {
  id: number;
  node_id: string;
  topping_category_id: number;
  topping_parent_id: number;
  description: string;
  price: number;
  units: number;
}

export interface RestaurantConfig {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  platforms: number;
  fromPrice: number;
  imageUrl?: string;
  // IDs por plataforma
  rappi_store_id: string;
  ubereats_store_id: string;
  rappi_product_id: string;
  ubereats_product_id: string;
  // Producto que se compara por defecto
  product_name: string;
  product_description: string;
  // Toppings de Rappi (opcionales) - necesarios para la simulación de checkout real
  rappi_toppings?: RappiTopping[];
}

export const RESTAURANTS: RestaurantConfig[] = [
  {
    id: "little-caesars-culiacan",
    name: "Little Caesars",
    cuisine: "Pizza",
    rating: 4.5,
    platforms: 2,
    fromPrice: 189,
    rappi_store_id: "1923772704",
    ubereats_store_id: "793b1eae-e077-44d0-8744-cf23f54fec50",
    rappi_product_id: "9099272",
    ubereats_product_id: "ea8fedb8-b710-40e1-b5b4-b53cd00a8c12",
    product_name: "Combo Crazy Puffs",
    product_description: "1 pizza grande de Pepperoni + 1 CRAZY PUFFS",
    rappi_toppings: [
      {
        id: 9099274,
        node_id: "9099272-9099273-9099274",
        topping_category_id: 9099273,
        topping_parent_id: 9099272,
        description: "Pepperoni",
        price: 0,
        units: 1,
      },
      {
        id: 9099276,
        node_id: "9099272-9099275-9099276",
        topping_category_id: 9099275,
        topping_parent_id: 9099272,
        description: "Crazy Puffs Hula Hawaiian",
        price: 0,
        units: 1,
      },
    ],
  },
];
