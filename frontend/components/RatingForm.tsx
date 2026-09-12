"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { getFingerprintHash } from "@/lib/fingerprint";
import { getVoterId } from "@/lib/voterId";
import type { TargetType } from "@/types";

interface RatingFormProps {
  targetType: TargetType;
  targetId: number;
  manifestoItemId?: number;
  onSubmitted?: () => void;
  /** Bump this value (e.g. Date.now()) to imperatively focus the comment textbox - used by the
   * anti-bias vote prompt so a citizen's cursor lands directly in the comment field instead of
   * on the star rating, reducing anchoring bias toward whatever star they click first. */
  focusSignal?: number;
}

const SUBMIT_TIMEOUT_MS = 15000;

export default function RatingForm({ targetType, targetId, manifestoItemId, onSubmitted, focusSignal }: RatingFormProps) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const commentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focusSignal) commentRef.current?.focus();
  }, [focusSignal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      const form = new FormData();
      form.append("target_type", targetType);
      form.append("target_id", String(targetId));
      form.append("voter_id", getVoterId());
      form.append("fingerprint_hash", await getFingerprintHash());
      form.append("stars", String(stars));
      if (manifestoItemId) form.append("manifesto_item_id", String(manifestoItemId));
      if (comment) form.append("comment", comment);
      if (photo) form.append("photo", photo);

      const res = await fetch(`${API_BASE_URL}/api/ratings`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: "Failed to submit rating" }));
        throw new Error(typeof body.detail === "string" ? body.detail : "Failed to submit rating");
      }
      setStatus("done");
      onSubmitted?.();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof DOMException && err.name === "TimeoutError"
        ? "The request timed out. Please check your connection and try again."
        : err instanceof Error
          ? err.message
          : "Failed to submit rating");
    }
  }

  if (status === "done") {
    return <p className="text-sm font-medium text-kenya-green">Thanks — your feedback was recorded for this cycle.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
      <div>
        <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Rating</label>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              type="button"
              key={value}
              aria-label={`${value} star`}
              onClick={() => setStars(value)}
              className={`text-2xl leading-none ${value <= stars ? "text-yellow-500" : "text-gray-300 dark:text-gray-600"}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="comment" className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
          Comment
        </label>
        <textarea
          id="comment"
          ref={commentRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          placeholder="Share your experience..."
        />
      </div>
      <div>
        <label htmlFor="photo" className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
          Photo evidence (optional)
        </label>
        <input
          id="photo"
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="mt-1 w-full text-sm dark:text-gray-300"
        />
      </div>
      {status === "error" && <p className="text-sm text-red-600">{errorMessage}</p>}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded bg-kenya-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting..." : "Submit rating"}
      </button>
    </form>
  );
}
