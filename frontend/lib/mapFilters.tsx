"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { County } from "@/types";

export type Layer = "leaders" | "services" | "expenditure";
export type SelectionSource = "QUICK_JUMP" | "COUNTY_DROPDOWN" | "INITIAL_LOAD";

const COUNTY_QUERY_PARAM = "county";

function readCountyParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(COUNTY_QUERY_PARAM);
}

/** Keeps the URL shareable/bookmarkable as a deep link, without a full navigation. */
function writeCountyParam(county: County | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (county) url.searchParams.set(COUNTY_QUERY_PARAM, county.name);
  else url.searchParams.delete(COUNTY_QUERY_PARAM);
  window.history.replaceState({}, "", url.toString());
}

interface MapFiltersContextValue {
  layer: Layer;
  setLayer: (layer: Layer) => void;
  counties: County[];
  /** Single source of truth for the active county - both LocationDropdown and QuickJumpStrip
   * read from here instead of keeping their own local "selected" state, so the two controls
   * (and the map camera) can never desync from each other. `null` = Countrywide. */
  selectedCounty: County | null;
  /** Which quick-jump chip (by county id) is highlighted - cleared whenever the dropdown is
   * the trigger, even if it happens to reselect the same county as an already-active chip. */
  activeQuickJumpPill: number | null;
  selectionSource: SelectionSource;
  /** Bumped only for an actual (non-Countrywide) dropdown pick so QuickJumpStrip can re-fetch
   * suggestions ("if relevant") - a Countrywide reset deliberately does NOT bump this, so the
   * existing chips stay intact per TASK.md line 695. */
  quickJumpRefreshToken: number;
  selectCountyFromDropdown: (county: County | null) => void;
  selectCountyFromQuickJump: (county: County) => void;
  /** Live counts for the header dropdown's notification pills (TASK.md line 744) - published
   * by MapView (which owns the officials/amenities/projects data and the map viewport bounds)
   * since LocationDropdown lives in the header, outside MapView's own component tree. */
  viewportItemCount: number;
  totalItemCount: number;
  setLayerCounts: (counts: { viewport: number; total: number }) => void;
}

const MapFiltersContext = createContext<MapFiltersContextValue | null>(null);

/** Shared header<->map state: the header renders the filter dropdowns, but the map (a
 * sibling in the tree, not a child) owns the actual Google Maps instance, so selections
 * are relayed through this context rather than prop-drilling through the layout. */
export function MapFiltersProvider({ children }: { children: React.ReactNode }) {
  const [layer, setLayer] = useState<Layer>("leaders");
  const [counties, setCounties] = useState<County[]>([]);
  const [selectedCounty, setSelectedCounty] = useState<County | null>(null);
  const [activeQuickJumpPill, setActiveQuickJumpPill] = useState<number | null>(null);
  const [selectionSource, setSelectionSource] = useState<SelectionSource>("INITIAL_LOAD");
  const [quickJumpRefreshToken, setQuickJumpRefreshToken] = useState(0);
  const [viewportItemCount, setViewportItemCount] = useState(0);
  const [totalItemCount, setTotalItemCount] = useState(0);

  const setLayerCounts = useCallback(({ viewport, total }: { viewport: number; total: number }) => {
    setViewportItemCount(viewport);
    setTotalItemCount(total);
  }, []);

  // Deep-link hydration: resolve a `?county=` query param against the real county list once,
  // on first mount only. Leaving selectionSource at INITIAL_LOAD (and selectedCounty at null)
  // when there's no param is what stops the map camera from firing on a plain fresh load.
  useEffect(() => {
    api
      .get<County[]>("/api/counties")
      .then((list) => {
        setCounties(list);
        const countyParam = readCountyParam();
        const match = countyParam
          ? list.find((c) => c.name.toLowerCase() === countyParam.toLowerCase())
          : undefined;
        if (match) {
          setSelectedCounty(match);
          setSelectionSource("COUNTY_DROPDOWN");
        }
      })
      .catch(() => setCounties([]));
  }, []);

  const selectCountyFromDropdown = useCallback((county: County | null) => {
    setSelectionSource("COUNTY_DROPDOWN");
    setActiveQuickJumpPill(null);
    if (county) setQuickJumpRefreshToken((t) => t + 1);
    writeCountyParam(county);
    // Exact-match guard: returning the SAME state value makes React bail out of the update
    // entirely (no re-render, no effect re-run), which is what guarantees the map camera only
    // ever fires once per genuinely new county, regardless of which UI triggered it.
    setSelectedCounty((prev) => (prev?.id === county?.id ? prev : county));
  }, []);

  const selectCountyFromQuickJump = useCallback((county: County) => {
    setSelectionSource("QUICK_JUMP");
    setActiveQuickJumpPill(county.id);
    writeCountyParam(county);
    setSelectedCounty((prev) => (prev?.id === county.id ? prev : county));
  }, []);

  return (
    <MapFiltersContext.Provider
      value={{
        layer,
        setLayer,
        counties,
        selectedCounty,
        activeQuickJumpPill,
        selectionSource,
        quickJumpRefreshToken,
        selectCountyFromDropdown,
        selectCountyFromQuickJump,
        viewportItemCount,
        totalItemCount,
        setLayerCounts,
      }}
    >
      {children}
    </MapFiltersContext.Provider>
  );
}


export function useMapFilters(): MapFiltersContextValue {
  const ctx = useContext(MapFiltersContext);
  if (!ctx) throw new Error("useMapFilters must be used within MapFiltersProvider");
  return ctx;
}
