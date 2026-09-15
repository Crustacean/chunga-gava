"use client";

import { useEffect, useState } from "react";

export interface ComparisonNode {
  id: number | string;
  name: string;
  photoSrc: string;
  percentage: number;
  ringColorClass: string;
}

interface PeerComparisonBarProps {
  label: string;
  nodes: ComparisonNode[];
}

function clampPct(value: number): number {
  return Math.min(100, Math.max(0, value));
}

const COLLISION_THRESHOLD_PCT = 5;

/** Horizontal "slider node" track: a filled pill track with circular avatar badges sitting on
 * top at each node's score percentage (mirrors the reference account-progress-bar design). The
 * fill runs up to the highest node's percentage, so a two-node bar visually shows who's ahead.
 * When two nodes land within a few points of each other, the second one is raised into an
 * Instagram-style stacked bubble (offset + background-matched border cutout) instead of
 * overlapping illegibly; it snaps back to sitting centered on the track once they separate. */
export default function PeerComparisonBar({ label, nodes }: PeerComparisonBarProps) {
  const [animatedFill, setAnimatedFill] = useState(0);
  const targetFill = nodes.length ? Math.max(...nodes.map((n) => clampPct(n.percentage))) : 0;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimatedFill(targetFill));
    return () => cancelAnimationFrame(raf);
  }, [targetFill]);

  const colliding =
    nodes.length === 2 &&
    Math.abs(clampPct(nodes[0].percentage) - clampPct(nodes[1].percentage)) < COLLISION_THRESHOLD_PCT;

  return (
    <div>
      <p className="mb-4 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <div className="relative h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-systemGreen transition-[width] duration-500 ease-out"
          style={{ width: `${animatedFill}%` }}
        />
        {nodes.map((node, i) => {
          const pct = clampPct(node.percentage);
          const isStackedTop = colliding && i === 1;
          // Stay clear of the track's right edge: shift left instead of right once close to 100%.
          const dx = isStackedTop ? (pct > 85 ? -10 : 10) : 0;
          const dy = isStackedTop ? -10 : 0;
          return (
            <div
              key={node.id}
              className={`absolute top-1/2 transition-[left] duration-500 ease-out ${isStackedTop ? "z-10" : ""}`}
              style={{ left: `${pct}%`, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))` }}
            >
              <div
                className={`h-8 w-8 overflow-hidden rounded-full bg-white shadow-md dark:bg-gray-800 ${
                  isStackedTop ? "ring-4 ring-white dark:ring-gray-800" : `ring-2 ${node.ringColorClass}`
                }`}
                title={`${node.name}: ${Math.round(node.percentage)}%`}
              >
                <img src={node.photoSrc} alt={node.name} className="h-full w-full object-cover" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
