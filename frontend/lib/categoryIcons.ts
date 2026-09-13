/** Shared glyph shapes for the 4 known public-service categories, used both by the Google Maps
 * marker icon builder (lib/mapIcons.ts, needs a raw SVG markup string for a data-URI) and the
 * map legend's inline badge (components/MapLegend.tsx, injects the same markup via
 * dangerouslySetInnerHTML so the two stay pixel-identical with zero duplicated coordinates -
 * safe here since the markup is a fixed, hardcoded constant, never derived from user input). */
export type CategoryIconKind = "building" | "check" | "shield" | "cap";

export const CATEGORY_ICON_BY_NAME: Record<string, CategoryIconKind> = {
  "Government Offices": "building",
  "Huduma Centers": "check",
  "Police Stations": "shield",
  Schools: "cap",
};

/** Glyph paths in a local -10..10 coordinate space centered at the badge's own center -
 * callers wrap this in a <g transform="translate(cx,cy)"> to place it inside a circle. */
export function categoryGlyphMarkup(kind: CategoryIconKind): string {
  switch (kind) {
    case "building":
      return `<polygon points="0,-9 8,-3 -8,-3" fill="#fff"/><rect x="-6" y="-2" width="2.4" height="9" fill="#fff"/><rect x="-1.2" y="-2" width="2.4" height="9" fill="#fff"/><rect x="3.6" y="-2" width="2.4" height="9" fill="#fff"/><rect x="-8" y="7" width="16" height="2" fill="#fff"/>`;
    case "check":
      return `<path d="M -6 0 L -2 4.5 L 7 -6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "shield":
      return `<path d="M 0 -9 L 7 -6 V 1 C 7 6 3.5 8.5 0 10 C -3.5 8.5 -7 6 -7 1 V -6 Z" fill="none" stroke="#fff" stroke-width="2"/>`;
    case "cap":
      return `<polygon points="0,-6 9,-1.5 0,3 -9,-1.5" fill="#fff"/><rect x="-2" y="-1" width="4" height="6" rx="1" fill="#fff"/><line x1="6.5" y1="-3.2" x2="6.5" y2="3" stroke="#fff" stroke-width="1.4"/>`;
  }
}
