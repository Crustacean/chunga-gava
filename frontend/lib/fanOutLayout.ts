// Visual sizing constants shared between layout math and the fan-out's own rendering.
export const NODE_DIAMETER_PX = 56;
export const PARENT_ICON_RADIUS_PX = 30;
export const CHILD_ICON_RADIUS_PX = NODE_DIAMETER_PX / 2;
// Anchored radius for the fan-out - fixed rather than grown per-cluster-size, so dense
// clusters never fling their icons far from the parent marker (see TASK.md line 607).
export const MIN_RADIUS_PX = 60;
export const ARC_SPAN_DEG = 90; // default quarter-circle sweep
export const MAX_NODES = 8; // keep a huge cluster from producing an unusable, overlapping fan

/** Default layout is always the quarter-circle arc; this only returns true when packing
 * `nodeCount` nodes into that 90deg arc at `radius` would make adjacent icons overlap
 * (independent of viewport size - a dense cluster can overlap on any screen). Adjacent nodes
 * are the closest pair on a convex <=180deg arc, so checking their chord distance suffices. */
export function wouldArcNodesOverlap(nodeCount: number, radius: number): boolean {
  if (nodeCount <= 1) return false;
  const stepRad = (ARC_SPAN_DEG / (nodeCount - 1) * Math.PI) / 180;
  const chordPx = 2 * radius * Math.sin(stepRad / 2);
  return chordPx < NODE_DIAMETER_PX;
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
