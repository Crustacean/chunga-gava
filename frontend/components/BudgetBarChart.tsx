interface BudgetBarChartProps {
  allocated: number;
  spent: number;
}

function formatKes(value: number): string {
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

/** Minimal dependency-free bar comparison of allocated vs. spent budget. */
export default function BudgetBarChart({ allocated, spent }: BudgetBarChartProps) {
  const max = Math.max(allocated, spent, 1);
  const bars = [
    { label: "Allocated", value: allocated, color: "#2563eb" },
    { label: "Spent", value: spent, color: spent > allocated ? "#dc2626" : "#16a34a" },
  ];

  return (
    <div className="space-y-2">
      {bars.map((bar) => (
        <div key={bar.label}>
          <div className="mb-0.5 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
            <span>{bar.label}</span>
            <span className="font-semibold">{formatKes(bar.value)}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(2, (bar.value / max) * 100)}%`, backgroundColor: bar.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
