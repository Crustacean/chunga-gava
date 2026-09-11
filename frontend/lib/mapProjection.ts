/** Continuously converts a LatLng into viewport-fixed screen pixels (position: fixed
 * coordinate space), so overlays can stay tethered to a map feature during pan/zoom. */
export interface PixelProjector {
  toPixel: (latLng: google.maps.LatLngLiteral) => { x: number; y: number } | null;
  destroy: () => void;
}

export function createPixelProjector(map: google.maps.Map): PixelProjector {
  class ProjectionOverlay extends google.maps.OverlayView {
    onAdd() {}
    draw() {}
    onRemove() {}
  }

  const overlay = new ProjectionOverlay();
  overlay.setMap(map);

  return {
    toPixel(latLng) {
      const projection = overlay.getProjection();
      if (!projection) return null;
      const point = projection.fromLatLngToContainerPixel(new google.maps.LatLng(latLng.lat, latLng.lng));
      if (!point) return null;
      // fromLatLngToContainerPixel is relative to the map's own div, not the viewport -
      // add the div's viewport offset to get position:fixed-compatible coordinates.
      const rect = map.getDiv().getBoundingClientRect();
      return { x: rect.left + point.x, y: rect.top + point.y };
    },
    destroy() {
      overlay.setMap(null);
    },
  };
}
