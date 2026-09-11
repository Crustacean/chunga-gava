"use client";

import { useEffect, useRef, useState } from "react";
import RatingForm from "@/components/RatingForm";
import type { Official } from "@/types";

interface ManifestoModalProps {
  official: Official | null;
  onClose: () => void;
  /** When set, anchors the modal near this screen point (e.g. a clicked fan-out node)
   * instead of the default centered modal behavior. */
  anchor?: { x: number; y: number } | null;
}

export default function ManifestoModal({ official, onClose, anchor }: ManifestoModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!official) {
      if (dialog.open) dialog.close();
      return;
    }

    setActiveItemId(null);

    if (anchor) {
      if (!dialog.open) dialog.show();
      const margin = 12;
      requestAnimationFrame(() => {
        const rect = dialog.getBoundingClientRect();
        let left = anchor.x - rect.width / 2;
        let top = anchor.y - rect.height - margin;
        left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin));
        if (top < margin) top = anchor.y + margin;
        top = Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin));
        Object.assign(dialog.style, { position: "fixed", left: `${left}px`, top: `${top}px`, margin: "0" });
      });
    } else {
      Object.assign(dialog.style, { position: "", left: "", top: "", margin: "" });
      if (!dialog.open) dialog.showModal();
    }
  }, [official, anchor]);

  if (!official) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-lg rounded-lg bg-white p-0 text-gray-900 backdrop:bg-black/50 dark:bg-gray-800 dark:text-gray-100"
    >
      <div className="max-h-[80vh] overflow-y-auto p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {official.photo_url && (
              <img
                src={official.photo_url}
                alt={official.name}
                className={`h-16 w-16 flex-shrink-0 rounded-full border-4 object-cover ${
                  official.role === "governor" ? "border-blue-600" : "border-gray-900 dark:border-gray-200"
                }`}
              />
            )}
            <div>
              <h2 className="text-lg font-bold">{official.name}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {official.role === "governor" ? "Governor" : "MCA"} · {official.county}
                {official.ward ? ` · ${official.ward} Ward` : ""}
              </p>
            </div>
          </div>
          <form method="dialog">
            <button aria-label="Close" className="text-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              &times;
            </button>
          </form>
        </div>

        <h3 className="mb-2 font-semibold">Manifesto</h3>
        {official.manifesto_items.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No manifesto items uploaded yet.</p>
        )}
        <ul className="space-y-3">
          {official.manifesto_items.map((item) => (
            <li key={item.id} className="rounded border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{item.title}</h4>
                <button
                  className="text-xs font-semibold text-kenya-green underline"
                  onClick={() => setActiveItemId(activeItemId === item.id ? null : item.id)}
                >
                  {activeItemId === item.id ? "Cancel" : "Rate this"}
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{item.description}</p>
              {activeItemId === item.id && (
                <div className="mt-2">
                  <RatingForm
                    targetType="official"
                    targetId={official.id}
                    manifestoItemId={item.id}
                    onSubmitted={() => setActiveItemId(null)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>

        <h3 className="mb-2 mt-4 font-semibold">Rate {official.name} overall</h3>
        <RatingForm targetType="official" targetId={official.id} />
      </div>
    </dialog>
  );
}
