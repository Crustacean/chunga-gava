"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { KnowledgeDocument } from "@/types";

const CATEGORIES = ["Constitution", "Traffic Law", "Budget", "Policy", "Other"];

export default function KnowledgeBaseUploader() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");

  function loadDocuments() {
    api
      .get<KnowledgeDocument[]>("/api/admin/knowledge-base")
      .then(setDocuments)
      .catch(() => setDocuments([]));
  }

  useEffect(loadDocuments, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus("uploading");
    setError("");
    const form = new FormData();
    form.append("title", title);
    form.append("category", category);
    form.append("file", file);
    try {
      await api.postForm("/api/admin/knowledge-base", form);
      setTitle("");
      setFile(null);
      setStatus("idle");
      loadDocuments();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="max-w-lg space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">Upload a document</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. The Constitution of Kenya, 2010)"
          required
          className="w-full rounded border border-gray-300 p-2 text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded border border-gray-300 p-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
          className="w-full text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={status === "uploading"}
          className="rounded bg-kenya-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {status === "uploading" ? "Processing..." : "Upload & index"}
        </button>
      </form>

      <div>
        <h2 className="mb-2 font-semibold">Knowledge base documents</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="py-1">Title</th>
              <th>Category</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b border-gray-100">
                <td className="py-1">{doc.title}</td>
                <td>{doc.category}</td>
                <td>
                  <span
                    className={
                      doc.status === "ready"
                        ? "text-kenya-green"
                        : doc.status === "failed"
                        ? "text-red-600"
                        : "text-gray-500"
                    }
                  >
                    {doc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
