"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Official, OfficialRole, ReportFrequency } from "@/types";

const FREQUENCIES: ReportFrequency[] = ["daily", "weekly", "monthly", "quarterly"];

interface ManifestoDraft {
  title: string;
  description: string;
}

export default function OfficialsManager() {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState<OfficialRole>("governor");
  const [county, setCounty] = useState("");
  const [ward, setWard] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [reportFrequency, setReportFrequency] = useState<ReportFrequency>("monthly");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [manifestoItems, setManifestoItems] = useState<ManifestoDraft[]>([{ title: "", description: "" }]);
  const [error, setError] = useState("");

  function loadOfficials() {
    api.get<Official[]>("/api/officials").then(setOfficials).catch(() => setOfficials([]));
  }

  useEffect(loadOfficials, []);

  function updateManifestoItem(index: number, field: keyof ManifestoDraft, value: string) {
    setManifestoItems((items) => items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/admin/officials", {
        name,
        role,
        county,
        ward: ward || null,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        report_frequency: reportFrequency,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        manifesto_items: manifestoItems.filter((m) => m.title.trim()),
      });
      setName("");
      setCounty("");
      setWard("");
      setLat("");
      setLng("");
      setManifestoItems([{ title: "", description: "" }]);
      loadOfficials();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save official");
    }
  }

  async function updateFrequency(official: Official, frequency: ReportFrequency) {
    await api.put(`/api/admin/officials/${official.id}`, { report_frequency: frequency });
    loadOfficials();
  }

  async function handleDelete(id: number) {
    await api.del(`/api/admin/officials/${id}`);
    loadOfficials();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="max-w-xl space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">Add Governor / MCA</h2>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            required
            className="rounded border border-gray-300 p-2 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as OfficialRole)}
            className="rounded border border-gray-300 p-2 text-sm"
          >
            <option value="governor">Governor</option>
            <option value="mca">MCA</option>
          </select>
          <input
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            placeholder="County"
            required
            className="rounded border border-gray-300 p-2 text-sm"
          />
          <input
            value={ward}
            onChange={(e) => setWard(e.target.value)}
            placeholder="Ward (MCA only)"
            className="rounded border border-gray-300 p-2 text-sm"
          />
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="Latitude"
            required
            className="rounded border border-gray-300 p-2 text-sm"
          />
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="Longitude"
            required
            className="rounded border border-gray-300 p-2 text-sm"
          />
          <input
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="Contact email (for reports)"
            className="rounded border border-gray-300 p-2 text-sm"
          />
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="Contact phone (for reports)"
            className="rounded border border-gray-300 p-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-gray-500">
            Report dispatch frequency
          </label>
          <select
            value={reportFrequency}
            onChange={(e) => setReportFrequency(e.target.value as ReportFrequency)}
            className="mt-1 rounded border border-gray-300 p-2 text-sm"
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-gray-500">Manifesto items</label>
          {manifestoItems.map((item, idx) => (
            <div key={idx} className="mt-1 grid grid-cols-2 gap-2">
              <input
                value={item.title}
                onChange={(e) => updateManifestoItem(idx, "title", e.target.value)}
                placeholder="Item title"
                className="rounded border border-gray-300 p-2 text-sm"
              />
              <input
                value={item.description}
                onChange={(e) => updateManifestoItem(idx, "description", e.target.value)}
                placeholder="Description"
                className="rounded border border-gray-300 p-2 text-sm"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setManifestoItems((items) => [...items, { title: "", description: "" }])}
            className="mt-2 text-xs font-semibold text-kenya-green underline"
          >
            + Add manifesto item
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-kenya-green px-4 py-2 text-sm font-semibold text-white">
          Save official
        </button>
      </form>

      <div>
        <h2 className="mb-2 font-semibold">Officials</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="py-1">Name</th>
              <th>Role</th>
              <th>County</th>
              <th>Report frequency</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {officials.map((o) => (
              <tr key={o.id} className="border-b border-gray-100">
                <td className="py-1">{o.name}</td>
                <td>{o.role}</td>
                <td>{o.county}</td>
                <td>
                  <select
                    value={o.report_frequency}
                    onChange={(e) => updateFrequency(o, e.target.value as ReportFrequency)}
                    className="rounded border border-gray-300 p-1 text-xs"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button onClick={() => handleDelete(o.id)} className="text-xs text-red-600 underline">
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
