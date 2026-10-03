"use client";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Lang = "es" | "en";

export const T = {
  es: {
    landing: {
      eyebrow: "Metabuscador de precios · México",
      headline: [["El", "precio", "real,"], ["antes", "de", "pedir."]],
      body: "Compara el costo final con envío en Rappi y Uber Eats. Sin abrir dos apps.",
      enter: "Entrar",
      marquee: ["Rappi", "Uber Eats", "¿Cuál es más barato?", "Rappi", "Uber Eats", "Tú decides"],
    },
    buscar: {
      title: "¿Qué se te antoja hoy?",
      subtitle: "Ve el precio final en Rappi y Uber Eats antes de pedir. Sin sorpresas.",
      searchPlaceholder: "Busca un restaurante o platillo...",
      allCategory: "Todo",
      noResults: "Sin resultados para",
      seeAll: "Ver todo",
      categories: {
        Todo: "Todo",
        Pizza: "Pizza",
        Hamburguesas: "Hamburguesas",
        Tacos: "Tacos",
        Sushi: "Sushi",
        Pollo: "Pollo",
        Postres: "Postres",
        Café: "Café",
      },
    },
    nav: {
      locationPlaceholder: "Colonia, fraccionamiento, plaza o avenida...",
      locationHint: "Escribe tu",
      locationHintBold: "colonia, fraccionamiento, plaza comercial o avenida",
      locationExamples: "Ej:",
      noResults: "Sin resultados. Prueba con el nombre del fraccionamiento o colonia.",
      themeDay: "Día claro",
      themeNight: "Noche",
    },
    compare: {
      selectTitle: "¿Qué quieres comparar?",
      selectSubtitle: "Solo se muestran productos disponibles en Rappi y Uber Eats.",
      searchPlaceholder: "Buscar producto…",
      retry: "Reintentar",
      noImage: "Sin imagen",
      priceTitle: "Precio final en cada plataforma",
      refresh: "Actualizar",
      checking: "Consultando precio…",
      noSearchResults: "Sin resultados para tu búsqueda.",
      noProducts: "No hay productos disponibles.",
      cheapest: "Más barato",
      product: "Producto",
      delivery: "Envío",
      serviceFee: "Cuota de servicio",
      total: "Total",
      approximate: "El precio puede variar algunos pesos.",
      approximateBold: "La plataforma más barata sí es real.",
      viewOn: "Ver en",
      goTo: "Ir a",
    },
    favoritos: {
      title: "Mis favoritos",
      empty: "Sin favoritos todavía",
      emptyHint: "Busca un restaurante, elige un producto y toca el corazón para guardarlo",
      searchButton: "Buscar restaurantes",
      compare: "Comparar",
      alertActive: "Alerta activa: te notificamos por email si el precio total baja 5% o más",
      alertActivate: "Activar alerta: te avisamos cuando baje el precio",
      alertActiveShort: "Alerta activa: te avisamos si baja 5% o más",
      historyTitle: "Historial de precios (últimos 7 días)",
      historyEmpty: "Sin datos todavía. Los precios se registran cada 6 horas automáticamente.",
      loadingHistory: "Cargando historial...",
      date: "Fecha",
      cheaper: "Más barato",
      equal: "Igual",
      noImage: "Sin img",
      showing: "Mostrando los últimos",
      of: "registros de",
      product: "prod",
      delivery: "envío",
      removeTitle: "Quitar de favoritos",
      historyTitle2: "Ver historial de precios",
    },
    auth: {
      myFavorites: "Mis favoritos",
      myAlerts: "Mis alertas",
      signOut: "Cerrar sesión",
      signIn: "Iniciar sesión",
    },
  },
  en: {
    landing: {
      eyebrow: "Food price comparison · Mexico",
      headline: [["The", "real", "price,"], ["before", "you", "order."]],
      body: "Compare the final cost with delivery on Rappi and Uber Eats. Without opening two apps.",
      enter: "Enter",
      marquee: ["Rappi", "Uber Eats", "Which is cheaper?", "Rappi", "Uber Eats", "You decide"],
    },
    buscar: {
      title: "What are you craving today?",
      subtitle: "See the final price on Rappi and Uber Eats before ordering. No surprises.",
      searchPlaceholder: "Search a restaurant or dish...",
      allCategory: "All",
      noResults: "No results for",
      seeAll: "See all",
      categories: {
        Todo: "All",
        Pizza: "Pizza",
        Hamburguesas: "Burgers",
        Tacos: "Tacos",
        Sushi: "Sushi",
        Pollo: "Chicken",
        Postres: "Desserts",
        Café: "Coffee",
      },
    },
    nav: {
      locationPlaceholder: "Neighborhood, subdivision, mall or avenue...",
      locationHint: "Type your",
      locationHintBold: "neighborhood, subdivision, mall or avenue",
      locationExamples: "E.g.:",
      noResults: "No results. Try the neighborhood or subdivision name.",
      themeDay: "Light mode",
      themeNight: "Dark mode",
    },
    compare: {
      selectTitle: "What do you want to compare?",
      selectSubtitle: "Only products available on Rappi and Uber Eats are shown.",
      searchPlaceholder: "Search product…",
      retry: "Retry",
      noImage: "No image",
      priceTitle: "Final price on each platform",
      refresh: "Refresh",
      checking: "Checking price…",
      noSearchResults: "No results for your search.",
      noProducts: "No products available.",
      cheapest: "Cheapest",
      product: "Product",
      delivery: "Delivery",
      serviceFee: "Service fee",
      total: "Total",
      approximate: "The price may vary a few pesos.",
      approximateBold: "The cheapest platform is still accurate.",
      viewOn: "View on",
      goTo: "Go to",
    },
    favoritos: {
      title: "My favorites",
      empty: "No favorites yet",
      emptyHint: "Search a restaurant, pick a product and tap the heart to save it",
      searchButton: "Search restaurants",
      compare: "Compare",
      alertActive: "Alert active: we'll notify you by email if the total price drops 5% or more",
      alertActivate: "Enable alert: we'll let you know when the price drops",
      alertActiveShort: "Alert active: we'll notify you if it drops 5% or more",
      historyTitle: "Price history (last 7 days)",
      historyEmpty: "No data yet. Prices are recorded every 6 hours automatically.",
      loadingHistory: "Loading history...",
      date: "Date",
      cheaper: "Cheaper",
      equal: "Same",
      noImage: "No img",
      showing: "Showing last",
      of: "records of",
      product: "prod",
      delivery: "delivery",
      removeTitle: "Remove from favorites",
      historyTitle2: "View price history",
    },
    auth: {
      myFavorites: "My favorites",
      myAlerts: "My alerts",
      signOut: "Sign out",
      signIn: "Sign in",
    },
  },
} as const;

type Translations = typeof T[Lang];

const LangCtx = createContext<{
  lang: Lang;
  t: Translations;
  toggle: () => void;
}>({ lang: "es", t: T.es, toggle: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");

  useEffect(() => {
    const saved = localStorage.getItem("kupi-lang") as Lang | null;
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);

  const toggle = () =>
    setLang((l) => {
      const next = l === "es" ? "en" : "es";
      localStorage.setItem("kupi-lang", next);
      return next;
    });

  return (
    <LangCtx.Provider value={{ lang, t: T[lang], toggle }}>
      {children}
    </LangCtx.Provider>
  );
}

export function useLang() {
  return useContext(LangCtx);
}
