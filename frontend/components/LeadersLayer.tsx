"use client";

import { MarkerClusterer, type Cluster, type Renderer } from "@googlemaps/markerclusterer";
import { useEffect, useRef } from "react";
import type { Official } from "@/types";

// `clusters` is protected on the base class; subclassing is the sanctioned way to read the
// clusterer's live output (needed to detect when a fanned-out cluster gets reclustered).
export class TrackableMarkerClusterer extends MarkerClusterer {
  getClusters(): Cluster[] {
    return this.clusters;
  }
}

const GOVERNOR_BORDER = "#1a73e8";
const MCA_BORDER = "#111827";

// SVG <image href> must have XML entities escaped, not raw query-string "&".
function escapeForSvg(value: string): string {
  return value.replace(/&/g, "&amp;");
}

function buildLeaderIcon(official: Official): google.maps.Icon {
  const size = 52;
  const r = size / 2;
  const imgR = r - 4;
  const border = official.role === "governor" ? GOVERNOR_BORDER : MCA_BORDER;
  const photo = official.photo_url ? escapeForSvg(official.photo_url) : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><clipPath id="clip"><circle cx="${r}" cy="${r}" r="${imgR}"/></clipPath></defs>
    <circle cx="${r}" cy="${r}" r="${r - 1.5}" fill="#e5e7eb" stroke="${border}" stroke-width="3"/>
    ${photo ? `<image href="${photo}" x="${r - imgR}" y="${r - imgR}" width="${imgR * 2}" height="${imgR * 2}" clip-path="url(#clip)" preserveAspectRatio="xMidYMid slice"/>` : ""}
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(r, r),
  };
}

/** Renders clustered leaders as a solid black circle with a white count, per spec. */
class ClusterCircleRenderer implements Renderer {
  render(cluster: Cluster): google.maps.Marker {
    const { count, position } = cluster;
    const size = Math.min(30 + Math.round(Math.sqrt(count) * 8), 76);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#111827" fill-opacity="0.92" stroke="#ffffff" stroke-width="2"/>
    </svg>`;
    return new google.maps.Marker({
      position,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: new google.maps.Size(size, size),
        anchor: new google.maps.Point(size / 2, size / 2),
      },
      label: { text: String(count), color: "#ffffff", fontSize: "13px", fontWeight: "700" },
      zIndex: 1000 + count,
    });
  }
}

interface LeadersLayerProps {
  map: google.maps.Map | null;
  officials: Official[];
  onSelectOfficial: (official: Official) => void;
  onSelectCluster: (
    officials: Official[],
    origin: { x: number; y: number },
    position: google.maps.LatLngLiteral
  ) => void;
  /** Lets the caller inspect live cluster membership (e.g. to detect when a fanned-out
   * cluster has been reclustered/disbanded by a zoom change) without duplicating the
   * clustering algorithm itself. Called with (null, empty map) on unmount/re-cluster. */
  onClustererReady?: (
    clusterer: TrackableMarkerClusterer | null,
    markerToOfficial: Map<google.maps.Marker, Official>
  ) => void;
}

/** Imperatively manages Google Maps markers + clustering; the Maps SDK's clustering
 * library isn't declarative/React-based, so it's driven directly off the map instance. */
export default function LeadersLayer({
  map,
  officials,
  onSelectOfficial,
  onSelectCluster,
  onClustererReady,
}: LeadersLayerProps) {
  const clustererRef = useRef<TrackableMarkerClusterer | null>(null);

  useEffect(() => {
    if (!map) return;

    const markerToOfficial = new Map<google.maps.Marker, Official>();
    const markers = officials.map((official) => {
      const marker = new google.maps.Marker({
        position: { lat: official.lat, lng: official.lng },
        icon: buildLeaderIcon(official),
        title: official.name,
      });
      marker.addListener("click", () => onSelectOfficial(official));
      markerToOfficial.set(marker, official);
      return marker;
    });

    const clusterer = new TrackableMarkerClusterer({
      map,
      markers,
      renderer: new ClusterCircleRenderer(),
      onClusterClick: (event, cluster) => {
        const clusterOfficials = (cluster.markers ?? [])
          .map((marker) => markerToOfficial.get(marker as google.maps.Marker))
          .filter((official): official is Official => !!official);
        const domEvent = event.domEvent as MouseEvent | undefined;
        const origin =
          domEvent && "clientX" in domEvent
            ? { x: domEvent.clientX, y: domEvent.clientY }
            : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const position = { lat: cluster.position.lat(), lng: cluster.position.lng() };
        onSelectCluster(clusterOfficials, origin, position);
      },
    });
    clustererRef.current = clusterer;
    onClustererReady?.(clusterer, markerToOfficial);

    return () => {
      onClustererReady?.(null, new Map());
      clusterer.setMap(null);
      clusterer.clearMarkers();
      markers.forEach((marker) => marker.setMap(null));
      clustererRef.current = null;
    };
  }, [map, officials, onSelectOfficial, onSelectCluster, onClustererReady]);

  return null;
}
