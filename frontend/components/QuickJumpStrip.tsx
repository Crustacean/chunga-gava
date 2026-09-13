"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { useMapFilters } from "@/lib/mapFilters";
import { useVotesCache } from "@/lib/votesCache";
import type { County } from "@/types";

/** Floating bottom-left pill strip suggesting up to 5 counties (AI-scored backend endpoint,
 * see GET /api/counties/quick-jump) - clicking a chip reuses the exact same requestCounty()
 * flow as the header's Location dropdown, so it gets the identical GTA5 cinematic pan/zoom
 * camera transition for free (see lib/mapZoom.ts / MapView.tsx's countyRequest effect). */
export default function QuickJumpStrip() {
  const { t } = useLanguage();
  const { requestCounty, countyRequest } = useMapFilters();
  const { fingerprintHash } = useVotesCache();
  const [suggestions, setSuggestions] = useState<County[]>([]);

  useEffect(() => {
    const query = fingerprintHash ? `?fingerprint_hash=${encodeURIComponent(fingerprintHash)}` : "";
    api
      .get<County[]>(`/api/counties/quick-jump${query}`)
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, [fingerprintHash]);

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm shadow-lg dark:bg-gray-800">
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 flex-shrink-0 text-emerald-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 3 3 10.5l7.5 3L14 21l7-18z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-bold text-gray-700 dark:text-gray-200">{t("quickJump")}:</span>
      <div className="flex items-center gap-1.5">
        {suggestions.map((county) => {
          const isActive = countyRequest?.county?.id === county.id;
          return (
            <button
              key={county.id}
              type="button"
              onClick={() => requestCounty(county)}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                isActive
                  ? "border-systemGreen bg-systemGreen/10 text-systemGreen"
                  : "border-transparent text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {county.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
