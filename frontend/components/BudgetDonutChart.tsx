"use client";

import { useEffect, useState } from "react";

interface BudgetDonutChartProps {
  totalAllocated: number;
  totalSpent: number;
  expenditurePct: number;
  size?: number;
}

function formatKes(value: number): string {
  if (value >= 1_000_000_000) return `KES ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `KES ${(value / 1_000_000).toFixed(1)}M`;
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

/** HIG threshold on the *remaining* budget (100 - spent%): >=70% remaining is healthy (green),
 * 30-70% is moderate (yellow), <30% (including negative, i.e. over-budget) is critical (red). */
function colorForExpenditure(expenditurePct: number): string {
  const remaining = 100 - expenditurePct;
  if (remaining >= 70) return "var(--color-system-green)";
  if (remaining >= 30) return "var(--color-system-yellow)";
  return "var(--color-system-red)";
}

/** Point on the ring at `t` full turns clockwise from 12 o'clock; negative `t` sweeps
 * anti-clockwise (12 -> 11 -> 10 -> 9 o'clock), as required by the spec. */
function pointAt(t: number, cx: number, cy: number, r: number): [number, number] {
  const theta = t * 2 * Math.PI;
  return [cx + r * Math.sin(theta), cy - r * Math.cos(theta)];
}

/** Anti-clockwise-depleting county budget donut: starts as a full colored ring (100% remaining)
 * and shrinks from 12 o'clock as spend eats into the budget. The ring visually caps at a full
 * circle, but the center label supports (and animates to) expenditure values over 100%. */
export default function BudgetDonutChart({ totalAllocated, totalSpent, expenditurePct, size = 140 }: BudgetDonutChartProps) {
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let frame: number;
    const duration = 800;
    function step(timestamp: number) {
      if (start === null) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / duration);
      setAnimatedPct(expenditurePct * progress);
      if (progress < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [expenditurePct]);

  const fraction = Math.min(1, Math.max(0, animatedPct / 100));
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const color = colorForExpenditure(expenditurePct);
  // Depletion model: the colored arc represents *remaining* budget and starts as a full ring
  // (100% remaining) at 12 o'clock, shrinking anti-clockwise as spend eats into it - the always
  // -present base ring is what's left showing through as a systemGray trail behind it.
  const remaining = 1 - fraction;
  const isFullyRemaining = remaining >= 1;
  const isFullyDepleted = remaining <= 0;
  const [ex, ey] = pointAt(remaining, cx, cy, r);
  const largeArc = remaining > 0.5 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={10}
          className="text-gray-200 dark:text-gray-700"
        />
        {isFullyRemaining ? (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10} />
        ) : !isFullyDepleted ? (
          <path
            d={`M ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
          />
        ) : null}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-gray-700 text-[11px] font-semibold dark:fill-gray-200">
          {formatKes(totalAllocated)}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="text-lg font-bold" style={{ fill: color }}>
          {Math.round(animatedPct)}%
        </text>
      </svg>
      <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
        County budget: {formatKes(totalSpent)} spent of {formatKes(totalAllocated)}
      </p>
    </div>
  );
}
