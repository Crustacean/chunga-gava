"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ExpenditureCategory, ExpenditureProject, ExpenditureStatus, Milestone } from "@/types";

const STATUS_OPTIONS: ExpenditureStatus[] = ["planned", "ongoing", "stalled", "completed"];
const MILESTONE_TYPES: Milestone["milestone"][] = ["started", "resumed", "stalled", "finished"];

interface ProjectPayload {
  name: string;
  category: string;
  county: string | null;
  lat: number;
  lng: number;
  description: string;
  spec_label: string | null;
  spec_value: string | null;
  budget_allocated: number;
  budget_spent: number;
  status: ExpenditureStatus;
  milestones: Milestone[];
}

const EMPTY_MILESTONE: Milestone = { date: "", milestone: "started", note: "" };

export default function ExpenditureProjectsManager() {
  const [projects, setProjects] = useState<ExpenditureProject[]>([]);
  const [categories, setCategories] = useState<ExpenditureCategory[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [county, setCounty] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [description, setDescription] = useState("");
  const [specLabel, setSpecLabel] = useState("");
  const [specValue, setSpecValue] = useState("");
  const [budgetAllocated, setBudgetAllocated] = useState("");
  const [budgetSpent, setBudgetSpent] = useState("");
  const [status, setStatus] = useState<ExpenditureStatus>("planned");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [error, setError] = useState("");
  const [pendingWarnings, setPendingWarnings] = useState<string[] | null>(null);
  const [pendingPayload, setPendingPayload] = useState<ProjectPayload | null>(null);

  function loadProjects() {
    api.get<ExpenditureProject[]>("/api/expenditure-projects").then(setProjects).catch(() => setProjects([]));
  }

  useEffect(loadProjects, []);

  useEffect(() => {
    api
      .get<ExpenditureCategory[]>("/api/expenditure-categories")
      .then((cats) => {
        setCategories(cats);
        setCategory((current) => current || cats[0]?.name || "");
      })
      .catch(() => setCategories([]));
  }, []);

  function resetForm() {
    setName("");
    setCounty("");
    setLat("");
    setLng("");
    setDescription("");
    setSpecLabel("");
    setSpecValue("");
    setBudgetAllocated("");
    setBudgetSpent("");
    setStatus("planned");
    setMilestones([]);
  }

  function buildPayload(): ProjectPayload {
    return {
      name,
      category,
      county: county || null,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      description,
      spec_label: specLabel || null,
      spec_value: specValue || null,
      budget_allocated: parseFloat(budgetAllocated) || 0,
      budget_spent: parseFloat(budgetSpent) || 0,
      status,
      milestones,
    };
  }

  async function saveProject(payload: ProjectPayload) {
    await api.post("/api/admin/expenditure-projects", { ...payload, acknowledged_warnings: true });
    setPendingWarnings(null);
    setPendingPayload(null);
    resetForm();
    loadProjects();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = buildPayload();
    try {
      const validation = await api.post<{ is_valid: boolean; warnings: string[] }>(
        "/api/admin/expenditure-projects/validate",
        {
          category: payload.category,
          spec_label: payload.spec_label,
          spec_value: payload.spec_value,
          budget_allocated: payload.budget_allocated,
          budget_spent: payload.budget_spent,
        }
      );
      if (!validation.is_valid) {
        setPendingWarnings(validation.warnings);
        setPendingPayload(payload);
        return;
      }
      await saveProject(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    }
  }

  async function handleConfirmAnyway() {
    if (!pendingPayload) return;
    try {
      await saveProject(pendingPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    }
  }

  async function handleDelete(id: number) {
    await api.del(`/api/admin/expenditure-projects/${id}`);
    loadProjects();
  }

  function updateMilestone(index: number, field: keyof Milestone, value: string) {
    setMilestones((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">Add public expenditure project</h2>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            required
            className="rounded border border-gray-300 p-2 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="rounded border border-gray-300 p-2 text-sm"
          >
            {categories.length === 0 && <option value="">No categories yet</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            placeholder="County"
            className="rounded border border-gray-300 p-2 text-sm"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ExpenditureStatus)}
            className="rounded border border-gray-300 p-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
            value={specLabel}
            onChange={(e) => setSpecLabel(e.target.value)}
            placeholder="Spec label (e.g. Road Length)"
            className="rounded border border-gray-300 p-2 text-sm"
          />
          <input
            value={specValue}
            onChange={(e) => setSpecValue(e.target.value)}
            placeholder="Spec value (e.g. 42 km)"
            className="rounded border border-gray-300 p-2 text-sm"
          />
          <input
            value={budgetAllocated}
            onChange={(e) => setBudgetAllocated(e.target.value)}
            placeholder="Budget allocated (KES)"
            type="number"
            required
            className="rounded border border-gray-300 p-2 text-sm"
          />
          <input
            value={budgetSpent}
            onChange={(e) => setBudgetSpent(e.target.value)}
            placeholder="Budget spent (KES)"
            type="number"
            required
            className="rounded border border-gray-300 p-2 text-sm"
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={2}
          className="w-full rounded border border-gray-300 p-2 text-sm"
        />

        <div>
          <label className="block text-xs font-semibold uppercase text-gray-500">Milestones</label>
          {milestones.map((m, idx) => (
            <div key={idx} className="mt-1 grid grid-cols-3 gap-2">
              <input
                type="date"
                value={m.date}
                onChange={(e) => updateMilestone(idx, "date", e.target.value)}
                className="rounded border border-gray-300 p-2 text-sm"
              />
              <select
                value={m.milestone}
                onChange={(e) => updateMilestone(idx, "milestone", e.target.value)}
                className="rounded border border-gray-300 p-2 text-sm"
              >
                {MILESTONE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input
                value={m.note ?? ""}
                onChange={(e) => updateMilestone(idx, "note", e.target.value)}
                placeholder="Note (optional)"
                className="rounded border border-gray-300 p-2 text-sm"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setMilestones((prev) => [...prev, { ...EMPTY_MILESTONE }])}
            className="mt-2 text-xs font-semibold text-kenya-green underline"
          >
            + Add milestone
          </button>
        </div>

        {pendingWarnings && pendingWarnings.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-900/40">
            <p className="mb-2 font-semibold text-amber-800 dark:text-amber-200">
              AI validation flagged this record against typical treasury benchmarks:
            </p>
            <ul className="mb-3 list-disc space-y-1 pl-5 text-amber-800 dark:text-amber-200">
              {pendingWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleConfirmAnyway}
              className="rounded bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Save anyway
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-kenya-green px-4 py-2 text-sm font-semibold text-white">
          Save project
        </button>
      </form>

      <div>
        <h2 className="mb-2 font-semibold">Expenditure projects</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="py-1">Name</th>
              <th>Category</th>
              <th>County</th>
              <th>Status</th>
              <th>Allocated</th>
              <th>Spent</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-gray-100">
                <td className="py-1">{p.name}</td>
                <td>{p.category}</td>
                <td>{p.county}</td>
                <td>{p.status}</td>
                <td>{p.budget_allocated.toLocaleString()}</td>
                <td>{p.budget_spent.toLocaleString()}</td>
                <td>
                  <button onClick={() => handleDelete(p.id)} className="text-xs text-red-600 underline">
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
