"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface Location {
  lat: number;
  lng: number;
  label: string;
}

// Coordenadas default: Plaza Forum Culiacán
const DEFAULT_LOCATION: Location = {
  lat: 24.8143484,
  lng: -107.4005298,
  label: "Culiacán, Sin.",
};

interface LocationContextType {
  location: Location;
  setLocation: (loc: Location) => void;
}

const LocationContext = createContext<LocationContextType>({
  location: DEFAULT_LOCATION,
  setLocation: () => {},
});

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}

export interface GeoSuggestion {
  lat: number;
  lng: number;
  label: string;
  fullLabel: string;
}

export async function searchAddress(query: string): Promise<GeoSuggestion[]> {
  if (query.trim().length < 3) return [];
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "6",
    countrycodes: "mx",
    addressdetails: "1",
    viewbox: "-107.55,24.72,-107.28,24.92",
    bounded: "0",
  });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "Accept-Language": "es", "User-Agent": "Kupi/1.0" },
    });
    const results = await res.json();
    return results.map((r: { lat: string; lon: string; display_name: string }) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      label: r.display_name.split(",").slice(0, 3).join(", "),
      fullLabel: r.display_name,
    }));
  } catch {
    return [];
  }
}
