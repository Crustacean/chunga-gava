// Standard "night mode" Google Maps style array (widely documented via Google's Maps
// styling wizard), used when the site is in dark mode.
export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1d2129" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d2129" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ea0b6" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d4dbe6" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#8ea0b6" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#25412e" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c3440" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212832" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8ea0b6" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a4658" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#232933" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#c8d3e0" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2c3440" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#111722" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a6076" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
];
