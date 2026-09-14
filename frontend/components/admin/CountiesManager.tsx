"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { County } from "@/types";

export default function CountiesManager() {
  const [counties, setCounties] = useState<County[]>([]);
  const [error, setError] = useState("");

  function loadCounties() {
    api.get<County[]>("/api/counties").then(setCounties).catch(() => setCounties([]));
  }

  useEffect(loadCounties, []);

  async function updateEmoji(county: County, emoji: string) {
    setError("");
    try {
      await api.put(`/api/admin/counties/${county.id}`, { emoji });
      loadCounties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update emoji");
    }
  }

  async function updateTagline(county: County, tagline: string) {
    setError("");
    try {
      await api.put(`/api/admin/counties/${county.id}`, { tagline });
      loadCounties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tagline");
    }
  }

  return (
    <div>
      <h2 className="mb-2 font-semibold">Counties</h2>
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Set the emoji and tagline shown for each county in the site's location filter dropdown.
      </p>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <th className="py-1">County</th>
            <th>Emoji</th>
            <th>Tagline</th>
          </tr>
        </thead>
        <tbody>
          {counties.map((county) => (
            <tr key={county.id} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-1">{county.name}</td>
              <td>
                <input
                  defaultValue={county.emoji}
                  onBlur={(e) => {
                    if (e.target.value !== county.emoji) updateEmoji(county, e.target.value);
                  }}
                  maxLength={8}
                  className="w-16 cg-input p-1 text-center text-lg"
                />
              </td>
              <td>
                <input
                  defaultValue={county.tagline}
                  onBlur={(e) => {
                    if (e.target.value !== county.tagline) updateTagline(county, e.target.value);
                  }}
                  maxLength={160}
                  className="w-full cg-input p-1"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
