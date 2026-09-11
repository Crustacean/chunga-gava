"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ServiceClass } from "@/types";

const COLOR_PALETTE: { label: string; value: string }[] = [
  { label: "Green", value: "#16a34a" },
  { label: "Blue", value: "#2563eb" },
  { label: "Red", value: "#dc2626" },
  { label: "Yellow", value: "#ca8a04" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Orange", value: "#ea580c" },
  { label: "Teal", value: "#0d9488" },
  { label: "Pink", value: "#db2777" },
];

export default function ServiceClassesManager() {
  const [classes, setClasses] = useState<ServiceClass[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0].value);
  const [error, setError] = useState("");

  function loadClasses() {
    api.get<ServiceClass[]>("/api/service-classes").then(setClasses).catch(() => setClasses([]));
  }

  useEffect(loadClasses, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/admin/service-classes", { name, color });
      setName("");
      setColor(COLOR_PALETTE[0].value);
      loadClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save service class");
    }
  }

  async function updateColor(serviceClass: ServiceClass, newColor: string) {
    await api.put(`/api/admin/service-classes/${serviceClass.id}`, { color: newColor });
    loadClasses();
  }

  async function handleDelete(id: number) {
    await api.del(`/api/admin/service-classes/${id}`);
    loadClasses();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="max-w-md space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">Add service class</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Class name (e.g. Water Points)"
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
          Save class
        </button>
      </form>

      <div>
        <h2 className="mb-2 font-semibold">Service classes</h2>
        <p className="mb-2 text-xs text-gray-500">
          Changing a class&apos;s color updates every map pin in that class immediately.
        </p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="py-1">Name</th>
              <th>Color</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {classes.map((serviceClass) => (
              <tr key={serviceClass.id} className="border-b border-gray-100">
                <td className="flex items-center gap-2 py-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: serviceClass.color }}
                  />
                  {serviceClass.name}
                </td>
                <td>
                  <select
                    value={serviceClass.color}
                    onChange={(e) => updateColor(serviceClass, e.target.value)}
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
                  <button
                    onClick={() => handleDelete(serviceClass.id)}
                    className="text-xs text-red-600 underline"
                  >
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
