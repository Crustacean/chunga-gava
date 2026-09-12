/** Self-contained, zero-network-dependency avatar generation for leader photos.
 *
 * The seeded demo "photos" all point at ui-avatars.com, which has proven unreliable here:
 * beyond generic network flakiness, embedding a *remote* image inside an SVG data URI used as
 * a Google Maps marker icon is fundamentally racy - Maps rasterizes the icon into a bitmap
 * essentially synchronously, so if the external <image> hasn't finished loading by then, the
 * marker is permanently blank (no repaint when the image arrives later). The same host being
 * unreachable also breaks the plain <img> version used in popups. Generating an equivalent
 * "colored circle + initials" avatar as an inline SVG data URI removes the network dependency
 * entirely: it's available synchronously, with zero round trip, everywhere it's embedded. */

const PALETTE: { bg: string; fg: string }[] = [
  { bg: "#1b5e20", fg: "#ffffff" },
  { bg: "#0d47a1", fg: "#ffffff" },
  { bg: "#4a148c", fg: "#ffffff" },
  { bg: "#b71c1c", fg: "#ffffff" },
  { bg: "#e65100", fg: "#ffffff" },
  { bg: "#006064", fg: "#ffffff" },
  { bg: "#33691e", fg: "#ffffff" },
  { bg: "#880e4f", fg: "#ffffff" },
];

export function getInitials(name: string): string {
  const clean = name.replace(/\([^)]*\)/g, "").trim();
  const initials = clean
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "?";
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function avatarColorsFor(name: string): { bg: string; fg: string } {
  return PALETTE[hashString(name) % PALETTE.length];
}

/** True for the ui-avatars.com placeholder "photos" seeded as demo data (or no photo at all) -
 * anything else is assumed to be a real, admin-uploaded photo and is left untouched. */
export function isPlaceholderAvatarUrl(url: string | null | undefined): boolean {
  return !url || url.includes("ui-avatars.com");
}

/** A fully self-contained data-URI SVG avatar (colored circle + initials), safe to embed
 * inside a Google Maps marker icon or use directly as an <img src>. */
export function buildAvatarDataUri(name: string, size = 128): string {
  const { bg, fg } = avatarColorsFor(name);
  const initials = getInitials(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${bg}"/>
    <text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="700" fill="${fg}">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Resolves the best photo src to use: the real photo_url if it's not a ui-avatars.com
 * placeholder, otherwise a locally-generated equivalent avatar (no network call). */
export function resolveAvatarSrc(name: string, photoUrl: string | null | undefined, size = 128): string {
  return isPlaceholderAvatarUrl(photoUrl) ? buildAvatarDataUri(name, size) : (photoUrl as string);
}
