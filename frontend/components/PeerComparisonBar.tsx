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

/** Horizontal "slider node" track: a filled pill track with circular avatar badges sitting on
 * top at each node's score percentage (mirrors the reference account-progress-bar design). The
 * fill runs up to the highest node's percentage, so a two-node bar visually shows who's ahead. */
export default function PeerComparisonBar({ label, nodes }: PeerComparisonBarProps) {
  const [animatedFill, setAnimatedFill] = useState(0);
  const targetFill = nodes.length ? Math.max(...nodes.map((n) => clampPct(n.percentage))) : 0;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimatedFill(targetFill));
    return () => cancelAnimationFrame(raf);
  }, [targetFill]);

  return (
    <div>
      <p className="mb-4 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <div className="relative h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-systemGreen transition-[width] duration-500 ease-out"
          style={{ width: `${animatedFill}%` }}
        />
        {nodes.map((node) => (
          <div
            key={node.id}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-500 ease-out"
            style={{ left: `${clampPct(node.percentage)}%` }}
          >
            <div
              className={`h-8 w-8 overflow-hidden rounded-full border-2 bg-white shadow-md dark:bg-gray-800 ${node.ringColorClass}`}
              title={`${node.name}: ${Math.round(node.percentage)}%`}
            >
              <img src={node.photoSrc} alt={node.name} className="h-full w-full object-cover" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
