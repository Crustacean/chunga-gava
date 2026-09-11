const COUNTY_TARGET_MAX_ZOOM = 15;
const COUNTY_ZOOM_FACTOR = 0.5;

/** The "50% zoomed in" target level, computed relative to the default (country-level)
 * zoom rather than whatever zoom the map happens to be at when a county is selected. */
export function computeCountyTargetZoom(defaultZoom: number): number {
  return Math.max(defaultZoom, Math.round(defaultZoom + COUNTY_ZOOM_FACTOR * (COUNTY_TARGET_MAX_ZOOM - defaultZoom)));
}

/** Steps the map's zoom level one increment at a time, spaced out so the whole transition
 * takes ~durationMs (Google Maps has no native zoom-transition animation, so smoothness
 * comes from animating one level at a time). Optionally re-asserts a center after every
 * step - Google anchors zoom changes on the map's *current* center, so without this an
 * in-flight `panTo` gets fought/interrupted and the map can drift off the target. */
function smoothZoomTo(
  map: google.maps.Map,
  targetZoom: number,
  durationMs: number,
  keepCenteredOn?: google.maps.LatLngLiteral
): Promise<void> {
  return new Promise((resolve) => {
    const startZoom = map.getZoom() ?? targetZoom;
    const steps = Math.abs(targetZoom - startZoom);
    if (steps === 0) {
      resolve();
      return;
    }
    const stepDelay = Math.max(16, durationMs / steps);
    const direction = targetZoom > startZoom ? 1 : -1;

    function step(current: number) {
      if (current === targetZoom) {
        if (keepCenteredOn) map.panTo(keepCenteredOn);
        resolve();
        return;
      }
      const next = current + direction;
      google.maps.event.addListenerOnce(map, "zoom_changed", () => {
        if (keepCenteredOn) map.panTo(keepCenteredOn);
        step(next);
      });
      window.setTimeout(() => map.setZoom(next), stepDelay);
    }
    step(startZoom);
  });
}

/** Pans and resolves once the map settles (Google Maps has no panTo-completion callback,
 * so "idle" - fired once rendering catches up after the pan - is used as the signal). */
function animatePanTo(map: google.maps.Map, target: google.maps.LatLngLiteral): Promise<void> {
  return new Promise((resolve) => {
    google.maps.event.addListenerOnce(map, "idle", () => resolve());
    map.panTo(target);
  });
}

export interface CinematicPanZoomParams {
  map: google.maps.Map;
  target: google.maps.LatLngLiteral;
  defaultZoom: number;
  speedMs: number;
}

/** GTA5-style camera transition for county selection:
 *  - If already zoomed in past the default level: zoom OUT to the default zoom first,
 *    THEN pan to the new county, THEN zoom back IN - three sequential phases so the
 *    camera never jump-cuts across the map while zoomed in.
 *  - If at/below the default (already zoomed out) level: pan and zoom in simultaneously,
 *    since there's nothing jarring about zooming into a wide view. */
export async function cinematicPanAndZoom({
  map,
  target,
  defaultZoom,
  speedMs,
}: CinematicPanZoomParams): Promise<void> {
  const targetZoom = computeCountyTargetZoom(defaultZoom);
  const currentZoom = map.getZoom() ?? defaultZoom;

  if (currentZoom > defaultZoom) {
    await smoothZoomTo(map, defaultZoom, speedMs);
    await animatePanTo(map, target);
    await smoothZoomTo(map, targetZoom, speedMs, target);
  } else {
    map.panTo(target);
    await smoothZoomTo(map, targetZoom, speedMs, target);
  }
}
