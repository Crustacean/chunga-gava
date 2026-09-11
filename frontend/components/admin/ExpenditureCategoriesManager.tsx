"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ExpenditureCategory } from "@/types";

const COLOR_PALETTE: { label: string; value: string }[] = [
  { label: "Orange", value: "#f97316" },
  { label: "Green", value: "#16a34a" },
  { label: "Sky Blue", value: "#0ea5e9" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Amber", value: "#eab308" },
  { label: "Red", value: "#dc2626" },
  { label: "Teal", value: "#0d9488" },
];

export default function ExpenditureCategoriesManager() {
  const [categories, setCategories] = useState<ExpenditureCategory[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0].value);
  const [error, setError] = useState("");

  function loadCategories() {
    api.get<ExpenditureCategory[]>("/api/expenditure-categories").then(setCategories).catch(() => setCategories([]));
  }

  useEffect(loadCategories, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/admin/expenditure-categories", { name, color });
      setName("");
      setColor(COLOR_PALETTE[0].value);
      loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    }
  }

  async function updateColor(category: ExpenditureCategory, newColor: string) {
    await api.put(`/api/admin/expenditure-categories/${category.id}`, { color: newColor });
    loadCategories();
  }

  async function handleDelete(id: number) {
    await api.del(`/api/admin/expenditure-categories/${id}`);
    loadCategories();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="max-w-md space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">Add expenditure category</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name (e.g. Bridges)"
          required
          className="w-full rounded border border-gray-300 p-2 text-sm"
        />
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-500">Pin color</label>
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
          >
            {COLOR_PALETTE.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-kenya-green px-4 py-2 text-sm font-semibold text-white">
          Save category
        </button>
      </form>

      <div>
        <h2 className="mb-2 font-semibold">Expenditure categories</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="py-1">Name</th>
              <th>Color</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="border-b border-gray-100">
                <td className="flex items-center gap-2 py-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                  {category.name}
                </td>
                <td>
                  <select
                    value={category.color}
                    onChange={(e) => updateColor(category, e.target.value)}
                    className="rounded border border-gray-300 p-1 text-xs"
                  >
                    {COLOR_PALETTE.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button onClick={() => handleDelete(category.id)} className="text-xs text-red-600 underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
