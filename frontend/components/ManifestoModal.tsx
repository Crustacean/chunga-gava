"use client";

import { useEffect, useRef, useState } from "react";
import StackedApprovalBar from "@/components/StackedApprovalBar";
import BudgetDonutChart from "@/components/BudgetDonutChart";
import RatingForm from "@/components/RatingForm";
import { api } from "@/lib/api";
import { resolveAvatarSrc } from "@/lib/avatar";
import { useVotesCache } from "@/lib/votesCache";
import type { Official, OfficialInsights } from "@/types";

interface ManifestoModalProps {
  official: Official | null;
  onClose: () => void;
  /** When set, anchors the modal near this screen point (e.g. a clicked fan-out node)
   * instead of the default centered modal behavior. */
  anchor?: { x: number; y: number } | null;
}

export default function ManifestoModal({ official, onClose, anchor }: ManifestoModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const overallRatingRef = useRef<HTMLDivElement>(null);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [insights, setInsights] = useState<OfficialInsights | null>(null);
  const [showVotePrompt, setShowVotePrompt] = useState(false);
  const [focusSignal, setFocusSignal] = useState(0);
  const { hasVoted, markVoted } = useVotesCache();
  const voted = official ? hasVoted("official", official.id) : false;

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

  // Anti-bias rating gate: whether this device's fingerprint has already voted this official's
  // "overall" score is read straight from the app-boot-warmed cache (see lib/votesCache.tsx) -
  // instant, no per-open network round trip or loading flash.
  useEffect(() => {
    setInsights(null);
    setShowVotePrompt(false);
  }, [official]);

  useEffect(() => {
    if (!official || !voted) return;
    api
      .get<OfficialInsights>(`/api/officials/${official.id}/insights`)
      .then(setInsights)
      .catch(() => setInsights(null));
  }, [official, voted]);

  function handleViewRatingClick() {
    setShowVotePrompt(true);
    setFocusSignal(Date.now());
    overallRatingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (!official) return null;

  const firstName = official.name.split(" ")[0];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-lg rounded-lg bg-white p-0 text-gray-900 backdrop:bg-black/50 dark:bg-gray-800 dark:text-gray-100"
    >
      <div className="cg-custom-scrollbar max-h-[80vh] overflow-y-auto p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={resolveAvatarSrc(official.name, official.photo_url, 128)}
              alt={official.name}
              className={`h-16 w-16 flex-shrink-0 rounded-full border-4 object-cover ${
                official.role === "governor" ? "border-blue-600" : "border-gray-900 dark:border-gray-200"
              }`}
            />
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

        {voted ? (
          insights ? (
            <div className="mb-4 space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300">{insights.ai_summary}</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center">
                <StackedApprovalBar
                  approvalPct={insights.approval_pct}
                  disapprovalPct={insights.disapproval_pct}
                  approvalCount={insights.approval_count}
                  disapprovalCount={insights.disapproval_count}
                />
                <BudgetDonutChart
                  totalAllocated={insights.county_budget_allocated}
                  totalSpent={insights.county_budget_spent}
                  expenditurePct={insights.county_expenditure_pct}
                />
              </div>
            </div>
          ) : (
            // Gate already unlocked (instant, from the optimistic cache write) - this only ever
            // shows for the brief moment while the real insights content is still loading, never
            // a flash back to the "unvoted" link below.
            <div className="mb-4 animate-pulse rounded-md border border-gray-200 p-3 text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
              Loading your insights…
            </div>
          )
        ) : (
          <button
            type="button"
            onClick={handleViewRatingClick}
            className="mb-4 text-sm font-semibold text-kenya-green underline"
          >
            View {firstName}&apos;s rating 🙈
          </button>
        )}

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
        <div ref={overallRatingRef}>
          {showVotePrompt && !voted && (
            <p className="mb-2 rounded-md bg-kenya-green/10 p-2 text-xs font-medium text-kenya-green">
              Cast your vote below to unlock {firstName}&apos;s rating insights.
            </p>
          )}
          <RatingForm
            targetType="official"
            targetId={official.id}
            focusSignal={focusSignal}
            onSubmitted={() => markVoted("official", official.id)}
          />
        </div>
      </div>
    </dialog>
  );
}
