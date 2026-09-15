interface StackedApprovalBarProps {
  approvalPct: number;
  disapprovalPct: number;
  approvalCount: number;
  disapprovalCount: number;
}

/** Single 100% stacked pill bar (systemGreen approval | systemRed disapproval), replacing the
 * old dual-bar layout for a more compact, instantly-scannable summary. */
export default function StackedApprovalBar({
  approvalPct,
  disapprovalPct,
  approvalCount,
  disapprovalCount,
}: StackedApprovalBarProps) {
  const total = approvalCount + disapprovalCount;
  if (total === 0) {
    return <p className="text-xs text-gray-400 dark:text-gray-500">No ratings recorded yet.</p>;
  }

  const tooltip = `${approvalCount.toLocaleString()} Approval Votes | ${disapprovalCount.toLocaleString()} Disapproval Votes`;

  return (
    <div
      className="flex h-8 w-full overflow-hidden rounded-full shadow-inner"
      title={tooltip}
      role="img"
      aria-label={tooltip}
    >
      {approvalPct > 0 && (
        <div
          className="flex items-center justify-center gap-1 bg-systemGreen text-xs font-bold text-white transition-[width,background-color] duration-300"
          style={{ width: `${approvalPct}%` }}
        >
          {approvalPct >= 18 && (
            <span>
              👍 {Math.round(approvalPct)}%
            </span>
          )}
        </div>
      )}
      {disapprovalPct > 0 && (
        <div
          className="flex items-center justify-center gap-1 bg-systemRed text-xs font-bold text-white transition-[width,background-color] duration-300"
          style={{ width: `${disapprovalPct}%` }}
        >
          {disapprovalPct >= 18 && (
            <span>
              👎 {Math.round(disapprovalPct)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
