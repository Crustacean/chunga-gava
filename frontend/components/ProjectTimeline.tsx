"use client";

import type { ExpenditureStatus, Milestone } from "@/types";

const MILESTONE_COLORS: Record<Milestone["milestone"], string> = {
  started: "#2563eb",
  resumed: "#16a34a",
  stalled: "#dc2626",
  finished: "#16a34a",
};

const MILESTONE_LABELS: Record<Milestone["milestone"], string> = {
  started: "Started",
  resumed: "Resumed",
  stalled: "Stalled",
  finished: "Finished",
};

interface ProjectTimelineProps {
  milestones: Milestone[];
  status: ExpenditureStatus;
}

/** Milestone timeline; projects that aren't yet "completed" get a dotted trailing line
 * extending from the last milestone to today, signaling ongoing/unfinished work. */
export default function ProjectTimeline({ milestones, status }: ProjectTimelineProps) {
  if (milestones.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">No milestones recorded yet.</p>;
  }

  const sorted = [...milestones].sort((a, b) => a.date.localeCompare(b.date));
  const isOngoing = status !== "completed";
  const firstTime = new Date(sorted[0].date).getTime();
  const lastMilestoneTime = new Date(sorted[sorted.length - 1].date).getTime();
  const endTime = isOngoing ? Math.max(lastMilestoneTime, Date.now()) : lastMilestoneTime;
  const span = Math.max(endTime - firstTime, 1);
  const width = 100;

  function xFor(dateStr: string): number {
    return ((new Date(dateStr).getTime() - firstTime) / span) * width;
  }

  const lastX = xFor(sorted[sorted.length - 1].date);

  return (
    <div className="pb-8 pt-2">
      <svg viewBox={`0 0 ${width} 10`} preserveAspectRatio="none" className="h-6 w-full overflow-visible">
        {sorted.slice(1).map((m, i) => (
          <line
            key={`line-${i}`}
            x1={xFor(sorted[i].date)}
            y1={5}
            x2={xFor(m.date)}
            y2={5}
            stroke="#9ca3af"
            strokeWidth={0.6}
          />
        ))}
        {isOngoing && (
          <line x1={lastX} y1={5} x2={width} y2={5} stroke="#9ca3af" strokeWidth={0.6} strokeDasharray="2,2" />
        )}
        {sorted.map((m, i) => (
          <circle key={i} cx={xFor(m.date)} cy={5} r={1.6} fill={MILESTONE_COLORS[m.milestone]} />
        ))}
      </svg>
      <div className="relative mt-1 h-10 text-[10px]">
        {sorted.map((m, i) => (
          <div key={i} className="absolute -translate-x-1/2 text-center" style={{ left: `${xFor(m.date)}%` }}>
            <div className="font-semibold" style={{ color: MILESTONE_COLORS[m.milestone] }}>
              {MILESTONE_LABELS[m.milestone]}
            </div>
            <div className="text-gray-400">{m.date}</div>
          </div>
        ))}
        {isOngoing && (
          <div className="absolute -translate-x-full text-right italic text-gray-400" style={{ left: "100%" }}>
            ongoing&hellip;
          </div>
        )}
      </div>
    </div>
  );
}
