"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Amenity, ServiceClass } from "@/types";

export default function AmenitiesManager() {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [serviceClasses, setServiceClasses] = useState<ServiceClass[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [county, setCounty] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [accessRequirements, setAccessRequirements] = useState("");
  const [error, setError] = useState("");

  function loadAmenities() {
    api.get<Amenity[]>("/api/amenities").then(setAmenities).catch(() => setAmenities([]));
  }

  useEffect(loadAmenities, []);

  useEffect(() => {
    api
      .get<ServiceClass[]>("/api/service-classes")
      .then((classes) => {
        setServiceClasses(classes);
        setCategory((current) => current || classes[0]?.name || "");
      })
      .catch(() => setServiceClasses([]));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/admin/amenities", {
        name,
        category,
        county: county || null,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        access_requirements: accessRequirements,
      });
      setName("");
      setCounty("");
      setLat("");
      setLng("");
      setAccessRequirements("");
      loadAmenities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save amenity");
    }
  }

  async function handleDelete(id: number) {
    await api.del(`/api/admin/amenities/${id}`);
    loadAmenities();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="max-w-xl space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">Add public amenity</h2>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Amenity name"
            required
            className="cg-input p-2 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="cg-input p-2 text-sm"
          >
            {serviceClasses.length === 0 && <option value="">No service classes yet</option>}
            {serviceClasses.map((sc) => (
              <option key={sc.id} value={sc.name}>
                {sc.name}
              </option>
            ))}
          </select>
          <input
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            placeholder="County"
            className="cg-input p-2 text-sm"
          />
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="Latitude"
            required
            className="cg-input p-2 text-sm"
          />
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="Longitude"
            required
            className="cg-input p-2 text-sm"
          />
        </div>
        <textarea
          value={accessRequirements}
          onChange={(e) => setAccessRequirements(e.target.value)}
          placeholder="Public access requirements (e.g. documents needed, fees, hours)"
          rows={3}
          required
          className="w-full cg-input p-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-kenya-green px-4 py-2 text-sm font-semibold text-white">
          Save amenity
        </button>
      </form>

      <div>
        <h2 className="mb-2 font-semibold">Amenities</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="py-1">Name</th>
              <th>Category</th>
              <th>County</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {amenities.map((a) => (
              <tr key={a.id} className="border-b border-gray-100">
                <td className="py-1">{a.name}</td>
                <td>{a.category}</td>
                <td>{a.county}</td>
                <td>
                  <button onClick={() => handleDelete(a.id)} className="text-xs text-red-600 underline">
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
