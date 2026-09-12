/** Compact vote/count formatter for header labels (e.g. "200k votes"). */
export function formatVoteCount(count: number): string {
  if (count < 1000) return String(count);
  const trim = (value: number) => (value % 1 === 0 ? String(value) : value.toFixed(1));
  if (count < 1_000_000) return `${trim(count / 1000)}k`;
  return `${trim(count / 1_000_000)}M`;
}
