"use client";

import { useEffect, useRef, useState } from "react";
import { resolveAvatarSrc } from "@/lib/avatar";
import { ARC_SPAN_DEG, MAX_NODES } from "@/lib/fanOutLayout";
import type { Official } from "@/types";

const STAGGER_MS = 60;

interface LeaderFanOutProps {
  officials: Official[];
  origin: { x: number; y: number };
  /** Distance from origin to each node's resting center; the caller drives this so it can
   * shrink responsively as the map zooms in (see lib/fanOutLayout.ts). */
  radius: number;
  /** "arc" (default) sweeps a quarter-circle above the parent; "radial" spreads nodes evenly
   * across the full 360deg instead, used when that arc would make adjacent icons overlap so
   * they get more angular room without growing the radius (see lib/fanOutLayout.ts). */
  layout?: "arc" | "radial";
  /** Flips true to make an already-expanded fan play its normal reverse-collapse animation
   * from an external trigger (e.g. the tracked cluster got disbanded by a zoom change). */
  forceCollapse?: boolean;
  onSelectLeader: (official: Official, screenPos: { x: number; y: number }) => void;
  onCollapse: () => void;
}

function nodeOffset(index: number, total: number, radius: number): { dx: number; dy: number } {
  if (total <= 1) return { dx: 0, dy: -radius };
  // Sweep a quarter-circle centered straight up, e.g. -45deg..-135deg in standard math angles.
  const start = -90 - ARC_SPAN_DEG / 2;
  const step = ARC_SPAN_DEG / (total - 1);
  const angleDeg = start + step * index;
  const angleRad = (angleDeg * Math.PI) / 180;
  return { dx: radius * Math.cos(angleRad), dy: radius * Math.sin(angleRad) };
}

/** Compact-viewport fallback: spread nodes evenly around the full circle (starting straight
 * up) instead of squeezing them into a 90deg arc, so they get more angular room at the same
 * anchored radius. */
function nodeOffsetRadial(index: number, total: number, radius: number): { dx: number; dy: number } {
  const angleDeg = (360 / total) * index - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  return { dx: radius * Math.cos(angleRad), dy: radius * Math.sin(angleRad) };
}

/** Radial "fan-out" overlay for a clicked cluster marker. Nodes are pure translate()d (never
 * rotated), so their name/role label is always horizontal regardless of arc position. */
export default function LeaderFanOut({
  officials,
  origin,
  radius,
  layout = "arc",
  forceCollapse,
  onSelectLeader,
  onCollapse,
}: LeaderFanOutProps) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const collapseTimeoutRef = useRef<number | null>(null);
  const shown = officials.slice(0, MAX_NODES);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setExpanded(true));
    return () => {
      cancelAnimationFrame(raf);
      // Cancel any pending collapse callback if this instance unmounts first (e.g. the
      // user clicked straight through to a different cluster) so it can't null out state
      // that already belongs to a newer, unrelated fan-out.
      if (collapseTimeoutRef.current) window.clearTimeout(collapseTimeoutRef.current);
    };
  }, []);

  function collapseThenClose() {
    setExpanded(false);
    collapseTimeoutRef.current = window.setTimeout(onCollapse, 220);
  }

  useEffect(() => {
    if (forceCollapse) collapseThenClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceCollapse]);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        collapseThenClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") collapseThenClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999]" style={{ pointerEvents: "none" }}>
      {shown.map((official, index) => {
        const { dx, dy } =
          layout === "radial"
            ? nodeOffsetRadial(index, shown.length, radius)
            : nodeOffset(index, shown.length, radius);
        const style: React.CSSProperties = {
          position: "fixed",
          left: origin.x,
          top: origin.y,
          transform: expanded
            ? `translate(-50%, -50%) translate(${dx}px, ${dy}px)`
            : "translate(-50%, -50%) translate(0, 0) scale(0.4)",
          opacity: expanded ? 1 : 0,
          transitionProperty: "transform, opacity",
          transitionDuration: "420ms",
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          transitionDelay: `${index * STAGGER_MS}ms`,
          pointerEvents: "auto",
        };
        return (
          <button
            key={official.id}
            type="button"
            style={style}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              onSelectLeader(official, { x: rect.left + rect.width / 2, y: rect.top });
            }}
            aria-label={`${official.name}, ${official.role === "governor" ? "Governor" : "MCA"}`}
            className="flex flex-col items-center gap-1 focus:outline-none"
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-lg ${
                official.role === "governor" ? "border-blue-600" : "border-gray-900 dark:border-gray-200"
              } bg-white dark:bg-gray-800`}
            >
              <img
                src={resolveAvatarSrc(official.name, official.photo_url, 88)}
                alt=""
                className="h-11 w-11 rounded-full object-cover"
              />
            </span>
            {/* Gravity label: never rotated, so it stays horizontal at every arc angle. */}
            <span className="max-w-[6rem] rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-white">
              {official.name.split(" ").slice(0, 2).join(" ")}
              <br />
              {official.role === "governor" ? "Governor" : "MCA"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
