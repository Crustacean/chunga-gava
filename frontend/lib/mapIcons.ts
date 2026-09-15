import { CATEGORY_ICON_BY_NAME, categoryGlyphMarkup } from "@/lib/categoryIcons";

/** Builds a round, colored badge marker icon. Government Offices/Huduma Centers/Police
 * Stations/Schools get a category-specific glyph (building/check/shield/cap); any other
 * (e.g. admin-added) category falls back to the plain emoji-in-circle badge. */
export function buildServicePinIcon(color: string, emoji: string = "📍", category?: string): google.maps.Icon {
  const size = 34;
  const kind = category ? CATEGORY_ICON_BY_NAME[category] : undefined;
  const glyph = kind
    ? `<g transform="translate(${size / 2}, ${size / 2})">${categoryGlyphMarkup(kind)}</g>`
    : `<text x="${size / 2}" y="${size / 2 + 5}" font-size="16" text-anchor="middle">${emoji}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="#ffffff" stroke-width="2"/>
    ${glyph}
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

export const DEFAULT_SERVICE_COLOR = "#6b7280";
