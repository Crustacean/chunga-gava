// Visual sizing constants shared between layout math and the fan-out's own rendering.
export const NODE_DIAMETER_PX = 56;
export const NODE_GAP_PX = 10;
export const PARENT_ICON_RADIUS_PX = 30;
export const CHILD_ICON_RADIUS_PX = NODE_DIAMETER_PX / 2;
export const ARC_SPAN_DEG = 90;
export const MIN_RADIUS_PX = 60;

/** Minimum radius (>= MIN_RADIUS_PX) needed so adjacent fanned-out nodes never overlap,
 * solved directly from the chord-length geometry of N nodes spread across a 90deg arc -
 * equivalent to (but far cheaper than) incrementally growing the radius until it fits. */
export function computeCollisionFreeRadius(count: number): number {
  if (count <= 1) return MIN_RADIUS_PX;
  const stepRad = (ARC_SPAN_DEG / (count - 1) / 180) * Math.PI;
  const requiredSeparation = NODE_DIAMETER_PX + NODE_GAP_PX;
  const requiredRadius = requiredSeparation / (2 * Math.sin(stepRad / 2));
  return Math.max(MIN_RADIUS_PX, Math.ceil(requiredRadius));
}

/** Zooming in draws the fan proportionally closer to the parent; zooming out (or staying
 * at/below the level the fan-out opened at) never grows it back past its base radius. */
export function computeZoomAdjustedRadius(baseRadius: number, zoomDelta: number): number {
  if (zoomDelta <= 0) return baseRadius;
  return baseRadius * Math.pow(0.72, zoomDelta);
}

// A precise circle-intersection-area computation isn't necessary for a UX trigger; treating
// "30% overlap" as the two icons' edge-gap having closed by 30% of their combined radii is a
// simple, monotonic, easy-to-reason-about proxy for the same effect.
const OVERLAP_TRIGGER_DISTANCE = (PARENT_ICON_RADIUS_PX + CHILD_ICON_RADIUS_PX) * 0.7;

export function isOverlappingParent(effectiveRadius: number): boolean {
  return effectiveRadius <= OVERLAP_TRIGGER_DISTANCE;
}
