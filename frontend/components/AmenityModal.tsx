"use client";

import { useEffect, useRef } from "react";
import RatingForm from "@/components/RatingForm";
import { useLanguage } from "@/lib/i18n";
import type { Amenity } from "@/types";

interface AmenityModalProps {
  amenity: Amenity | null;
  onClose: () => void;
  onRatingSubmitted?: () => void;
}

export default function AmenityModal({ amenity, onClose, onRatingSubmitted }: AmenityModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { tCategory } = useLanguage();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (amenity) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [amenity]);

  if (!amenity) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-lg rounded-lg bg-white p-0 text-gray-900 backdrop:bg-black/50 dark:bg-gray-800 dark:text-gray-100"
    >
      <div className="max-h-[80vh] overflow-y-auto p-5">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{amenity.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {tCategory(amenity.category)} {amenity.county ? `· ${amenity.county}` : ""}
            </p>
          </div>
          <form method="dialog">
            <button
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-xl leading-none text-gray-400 transition-colors hover:bg-black/10 hover:text-gray-700 dark:bg-white/10 dark:hover:bg-white/20 dark:hover:text-gray-200"
            >
              &times;
            </button>
          </form>
        </div>

        {amenity.ai_summary && (
          <div className="mb-3 rounded-md bg-kenya-green/10 p-3 dark:bg-kenya-green/20">
            <h3 className="text-xs font-semibold uppercase text-kenya-green">AI summary of citizen experiences</h3>
            <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{amenity.ai_summary}</p>
          </div>
        )}

        <h3 className="mb-1 font-semibold">Public access requirements</h3>
        <p className="mb-4 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{amenity.access_requirements}</p>

        <h3 className="mb-2 font-semibold">Rate this service</h3>
        <RatingForm targetType="amenity" targetId={amenity.id} onSubmitted={onRatingSubmitted} />
      </div>
    </dialog>
  );
}
