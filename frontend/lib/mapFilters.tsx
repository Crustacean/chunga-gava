"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { County } from "@/types";

export type Layer = "leaders" | "services" | "expenditure";

interface CountyRequest {
  token: number;
  county: County | null; // null = "Countrywide" (reset to the full country view)
}

interface MapFiltersContextValue {
  layer: Layer;
  setLayer: (layer: Layer) => void;
  countyRequest: CountyRequest | null;
  requestCounty: (county: County | null) => void;
}

const MapFiltersContext = createContext<MapFiltersContextValue | null>(null);

/** Shared header<->map state: the header renders the filter dropdowns, but the map (a
 * sibling in the tree, not a child) owns the actual Google Maps instance, so selections
 * are relayed through this context rather than prop-drilling through the layout. */
export function MapFiltersProvider({ children }: { children: React.ReactNode }) {
  const [layer, setLayer] = useState<Layer>("leaders");
  const [countyRequest, setCountyRequest] = useState<CountyRequest | null>(null);
  const tokenRef = useRef(0);

  const requestCounty = useCallback((county: County | null) => {
    tokenRef.current += 1;
    setCountyRequest({ token: tokenRef.current, county });
  }, []);

  return (
    <MapFiltersContext.Provider value={{ layer, setLayer, countyRequest, requestCounty }}>
      {children}
    </MapFiltersContext.Provider>
  );
}

export function useMapFilters(): MapFiltersContextValue {
  const ctx = useContext(MapFiltersContext);
  if (!ctx) throw new Error("useMapFilters must be used within MapFiltersProvider");
  return ctx;
}
