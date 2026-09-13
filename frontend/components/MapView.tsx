"use client";

import { GoogleMap, LoadScript, MarkerF } from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AmenityModal from "@/components/AmenityModal";
import ExpenditureModal from "@/components/ExpenditureModal";
import LeaderFanOut from "@/components/LeaderFanOut";
import LeadersLayer, { type TrackableMarkerClusterer } from "@/components/LeadersLayer";
import ManifestoModal from "@/components/ManifestoModal";
import MapLegend from "@/components/MapLegend";
import QuickJumpStrip from "@/components/QuickJumpStrip";
import { api } from "@/lib/api";
import { DARK_MAP_STYLE } from "@/lib/darkMapStyle";
import {
  computeZoomAdjustedRadius,
  isOverlappingParent,
  MAX_NODES,
  MIN_RADIUS_PX,
  wouldArcNodesOverlap,
} from "@/lib/fanOutLayout";
import { buildServicePinIcon, DEFAULT_SERVICE_COLOR } from "@/lib/mapIcons";
import { useMapFilters } from "@/lib/mapFilters";
import { createPixelProjector, type PixelProjector } from "@/lib/mapProjection";
import { cinematicPanAndZoom } from "@/lib/mapZoom";
import { useTheme } from "@/lib/theme";
import type { Amenity, ExpenditureCategory, ExpenditureProject, Official, ServiceClass } from "@/types";

const KENYA_CENTER = { lat: 0.0236, lng: 37.9062 };
// Roughly bounds the map to Kenya + a small margin so panning can't leave the country.
const KENYA_BOUNDS = { north: 5.6, south: -5.4, west: 33.5, east: 42.2 };
// Duration of each zoom phase in the county-selection camera transition; tune freely.
const ZOOM_SPEED_MS = 1500;

interface FanOutState {
  officials: Official[];
  signature: string;
  position: google.maps.LatLngLiteral;
  origin: { x: number; y: number };
  baseRadius: number;
  zoomAtOpen: number;
  radius: number;
  layoutMode: "arc" | "radial";
  forceCollapse: boolean;
}

function officialsSignature(list: Official[]): string {
  return list
    .map((o) => o.id)
    .sort((a, b) => a - b)
    .join(",");
}

export default function MapView() {
  const { theme } = useTheme();
  const { layer, selectedCounty, selectionSource } = useMapFilters();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [serviceClasses, setServiceClasses] = useState<ServiceClass[]>([]);
  const [selectedOfficial, setSelectedOfficial] = useState<Official | null>(null);
  const [reviewAnchor, setReviewAnchor] = useState<{ x: number; y: number } | null>(null);
  const [fanOut, setFanOut] = useState<FanOutState | null>(null);
  const [selectedAmenityId, setSelectedAmenityId] = useState<number | null>(null);
  const [amenityDetail, setAmenityDetail] = useState<Amenity | null>(null);
  const [activeServiceFilters, setActiveServiceFilters] = useState<string[]>([]);
  const [expenditureProjects, setExpenditureProjects] = useState<ExpenditureProject[]>([]);
  const [expenditureCategories, setExpenditureCategories] = useState<ExpenditureCategory[]>([]);
  const [activeExpenditureFilters, setActiveExpenditureFilters] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectDetail, setProjectDetail] = useState<ExpenditureProject | null>(null);
  // Modal-stack navigation: when "View Owner" is clicked from an expenditure card, this
  // remembers which project to pop back to when the governor card's X is clicked, without
  // touching the map (no pan/zoom) or losing the originating card's place in the stack.
  const [viewingOwnerOfProjectId, setViewingOwnerOfProjectId] = useState<number | null>(null);
  const [defaultZoom, setDefaultZoom] = useState<number | null>(null);
  const clustererRef = useRef<TrackableMarkerClusterer | null>(null);
  const markerToOfficialRef = useRef<Map<google.maps.Marker, Official>>(new Map());
  const projectorRef = useRef<PixelProjector | null>(null);

  useEffect(() => {
    api.get<Official[]>("/api/officials").then(setOfficials).catch(() => setOfficials([]));
    api.get<Amenity[]>("/api/amenities").then(setAmenities).catch(() => setAmenities([]));
    api.get<ServiceClass[]>("/api/service-classes").then(setServiceClasses).catch(() => setServiceClasses([]));
    api
      .get<ExpenditureProject[]>("/api/expenditure-projects")
      .then(setExpenditureProjects)
      .catch(() => setExpenditureProjects([]));
    api
      .get<ExpenditureCategory[]>("/api/expenditure-categories")
      .then(setExpenditureCategories)
      .catch(() => setExpenditureCategories([]));
  }, []);

  const refetchAmenityDetail = useCallback(() => {
    if (selectedAmenityId == null) return;
    api
      .get<Amenity>(`/api/amenities/${selectedAmenityId}`)
      .then(setAmenityDetail)
      .catch(() => {});
  }, [selectedAmenityId]);

  useEffect(() => {
    if (selectedAmenityId == null) {
      setAmenityDetail(null);
      return;
    }
    api
      .get<Amenity>(`/api/amenities/${selectedAmenityId}`)
      .then(setAmenityDetail)
      .catch(() => setAmenityDetail(null));
  }, [selectedAmenityId]);

  const refetchProjectDetail = useCallback(() => {
    if (selectedProjectId == null) return;
    api
      .get<ExpenditureProject>(`/api/expenditure-projects/${selectedProjectId}`)
      .then(setProjectDetail)
      .catch(() => {});
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId == null) {
      setProjectDetail(null);
      return;
    }
    api
      .get<ExpenditureProject>(`/api/expenditure-projects/${selectedProjectId}`)
      .then(setProjectDetail)
      .catch(() => setProjectDetail(null));
  }, [selectedProjectId]);

  const onMapLoad = useCallback((loadedMap: google.maps.Map) => {
    loadedMap.fitBounds(KENYA_BOUNDS);
    // Capture the zoom level once fitBounds finishes settling, so DEFAULT_ZOOM_LEVEL
    // reflects the actual initial country-level view rather than a transient value.
    google.maps.event.addListenerOnce(loadedMap, "idle", () => {
      setDefaultZoom(loadedMap.getZoom() ?? 6);
    });
    setMap(loadedMap);
  }, []);

  useEffect(() => {
    if (!map) return;
    const projector = createPixelProjector(map);
    projectorRef.current = projector;
    return () => {
      projector.destroy();
      projectorRef.current = null;
    };
  }, [map]);

  const handleClustererReady = useCallback(
    (clusterer: TrackableMarkerClusterer | null, markerToOfficial: Map<google.maps.Marker, Official>) => {
      clustererRef.current = clusterer;
      markerToOfficialRef.current = markerToOfficial;
    },
    []
  );

  const handleSelectOfficial = useCallback((official: Official) => {
    setReviewAnchor(null);
    setSelectedOfficial(official);
  }, []);

  // Pushes the county Governor's leader card onto the modal stack as an overlay directly on
  // top of the still-open, still-mounted Expenditure card - no map pan/zoom/layer change, and
  // (critically) selectedProjectId/projectDetail are left untouched so there's nothing to
  // re-fetch when popping back: the underlying <dialog> was never closed or unmounted, only
  // visually covered by the leader dialog stacking above it in the browser's native top layer.
  const handleViewOwner = useCallback(
    (project: ExpenditureProject) => {
      const governor = officials.find((o) => o.role === "governor" && o.county === project.county);
      if (!governor) return;
      setViewingOwnerOfProjectId(project.id);
      setReviewAnchor(null);
      setSelectedOfficial(governor);
    },
    [officials]
  );

  const handleCloseLeaderCard = useCallback(() => {
    if (viewingOwnerOfProjectId != null) {
      // Just pop the overlay - selectedProjectId/projectDetail were never changed, so the
      // Expenditure dialog underneath is already showing, instantly, with no re-fetch.
      setSelectedOfficial(null);
      setViewingOwnerOfProjectId(null);
      return;
    }
    setSelectedOfficial(null);
    setReviewAnchor(null);
  }, [viewingOwnerOfProjectId]);

  // Re-clicking the same cluster plays the normal reverse-collapse animation; clicking a
  // different one replaces it outright (it gets a fresh mount/open animation via its key).
  const handleSelectCluster = useCallback(
    (clustered: Official[], origin: { x: number; y: number }, position: google.maps.LatLngLiteral) => {
      const signature = officialsSignature(clustered);
      setFanOut((prev) => {
        if (prev && prev.signature === signature) {
          return { ...prev, forceCollapse: true };
        }
        const zoomAtOpen = map?.getZoom() ?? 6;
        // Fixed anchored radius (never grown per cluster size - see TASK.md line 607). Default
        // to the quarter-circle arc; only fall back to the full 360deg radial spread if that
        // arc would actually pack this many nodes tightly enough to overlap at this radius.
        const baseRadius = MIN_RADIUS_PX;
        const layoutMode = wouldArcNodesOverlap(Math.min(clustered.length, MAX_NODES), baseRadius)
          ? "radial"
          : "arc";
        return {
          officials: clustered,
          signature,
          position,
          origin,
          baseRadius,
          zoomAtOpen,
          radius: baseRadius,
          layoutMode,
          forceCollapse: false,
        };
      });
    },
    [map]
  );

  // Dynamic tracking: keep the fan tethered to its cluster's real screen position during
  // pan/zoom, shrink it as the user zooms in, and collapse it the moment the underlying
  // clusterer no longer groups these same officials together (zoomed past disband, merged
  // into a different cluster, etc).
  useEffect(() => {
    if (!map || !fanOut) return;

    function reprojectOrigin() {
      setFanOut((prev) => {
        if (!prev) return prev;
        const pixel = projectorRef.current?.toPixel(prev.position);
        return pixel ? { ...prev, origin: pixel } : prev;
      });
    }

    function recomputeZoomRadius() {
      setFanOut((prev) => {
        if (!prev) return prev;
        const currentZoom = map!.getZoom() ?? prev.zoomAtOpen;
        const effectiveRadius = computeZoomAdjustedRadius(prev.baseRadius, currentZoom - prev.zoomAtOpen);
        return {
          ...prev,
          radius: effectiveRadius,
          forceCollapse: prev.forceCollapse || isOverlappingParent(effectiveRadius),
        };
      });
    }

    function checkStillClustered() {
      const clusterer = clustererRef.current;
      if (!clusterer) return;
      setFanOut((prev) => {
        if (!prev) return prev;
        const stillExists = clusterer.getClusters().some((cluster) => {
          const clusterOfficials = (cluster.markers ?? [])
            .map((marker) => markerToOfficialRef.current.get(marker as google.maps.Marker))
            .filter((o): o is Official => !!o);
          return officialsSignature(clusterOfficials) === prev.signature;
        });
        return stillExists ? prev : { ...prev, forceCollapse: true };
      });
    }

    reprojectOrigin();
    const boundsListener = map.addListener("bounds_changed", reprojectOrigin);
    const zoomListener = map.addListener("zoom_changed", recomputeZoomRadius);
    const idleListener = map.addListener("idle", checkStillClustered);

    return () => {
      boundsListener.remove();
      zoomListener.remove();
      idleListener.remove();
    };
  }, [map, fanOut?.signature]);

  const handleSelectLeaderFromFanOut = useCallback((official: Official, screenPos: { x: number; y: number }) => {
    setFanOut(null);
    setReviewAnchor(screenPos);
    setSelectedOfficial(official);
  }, []);

  const colorByCategory = useMemo(
    () => new Map(serviceClasses.map((sc) => [sc.name, sc.color])),
    [serviceClasses]
  );

  const expenditureColorByCategory = useMemo(
    () => new Map(expenditureCategories.map((c) => [c.name, c.color])),
    [expenditureCategories]
  );

  // Legend "layer count" badges - live counts of every currently-loaded pin per category name.
  const serviceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const amenity of amenities) counts[amenity.category] = (counts[amenity.category] ?? 0) + 1;
    return counts;
  }, [amenities]);

  const expenditureCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const project of expenditureProjects) counts[project.category] = (counts[project.category] ?? 0) + 1;
    return counts;
  }, [expenditureProjects]);

  // Header "Location" dropdown / Quick Jump strip selections are relayed here via the shared
  // selectedCounty (single source of truth, TASK.md line 695) since both live outside this
  // component's tree. Skipping while selectionSource is still INITIAL_LOAD is what stops this
  // from firing an unwanted fitBounds on a plain fresh page load with no county selected yet.
  useEffect(() => {
    if (!map || selectionSource === "INITIAL_LOAD") return;
    if (selectedCounty) {
      cinematicPanAndZoom({
        map,
        target: { lat: selectedCounty.lat, lng: selectedCounty.lng },
        defaultZoom: defaultZoom ?? 6,
        speedMs: ZOOM_SPEED_MS,
      });
    } else {
      map.fitBounds(KENYA_BOUNDS);
    }
  }, [selectedCounty, selectionSource, map, defaultZoom]);

  // Empty filter = show every pin; otherwise show only the selected classes (multi-select).
  const toggleServiceFilter = useCallback((name: string) => {
    setActiveServiceFilters((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }, []);

  const toggleExpenditureFilter = useCallback((name: string) => {
    setActiveExpenditureFilters((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }, []);

  const visibleAmenities = useMemo(
    () =>
      activeServiceFilters.length === 0
        ? amenities
        : amenities.filter((a) => activeServiceFilters.includes(a.category)),
    [amenities, activeServiceFilters]
  );

  const visibleProjects = useMemo(
    () =>
      activeExpenditureFilters.length === 0
        ? expenditureProjects
        : expenditureProjects.filter((p) => activeExpenditureFilters.includes(p.category)),
    [expenditureProjects, activeExpenditureFilters]
  );

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  return (
    <div className="relative h-full w-full">
      {!apiKey ? (
        <div className="flex h-full items-center justify-center bg-gray-100 text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map.
        </div>
      ) : (
        <LoadScript googleMapsApiKey={apiKey}>
          <GoogleMap
            mapContainerClassName="h-full w-full"
            center={KENYA_CENTER}
            zoom={6}
            onLoad={onMapLoad}
            options={{
              restriction: { latLngBounds: KENYA_BOUNDS, strictBounds: false },
              streetViewControl: layer === "services",
              minZoom: 6,
              styles: theme === "dark" ? DARK_MAP_STYLE : undefined,
            }}
          >
            {layer === "services" &&
              visibleAmenities.map((amenity) => (
                <MarkerF
                  key={amenity.id}
                  position={{ lat: amenity.lat, lng: amenity.lng }}
                  icon={buildServicePinIcon(
                    colorByCategory.get(amenity.category) ?? DEFAULT_SERVICE_COLOR,
                    "\ud83d\udccd",
                    amenity.category
                  )}
                  onClick={() => setSelectedAmenityId(amenity.id)}
                />
              ))}

            {layer === "expenditure" &&
              visibleProjects.map((project) => (
                <MarkerF
                  key={project.id}
                  position={{ lat: project.lat, lng: project.lng }}
                  icon={buildServicePinIcon(
                    expenditureColorByCategory.get(project.category) ?? DEFAULT_SERVICE_COLOR,
                    "🏗️"
                  )}
                  onClick={() => setSelectedProjectId(project.id)}
                />
              ))}
          </GoogleMap>

          {layer === "leaders" && (
            <LeadersLayer
              map={map}
              officials={officials}
              onSelectOfficial={handleSelectOfficial}
              onSelectCluster={handleSelectCluster}
              onClustererReady={handleClustererReady}
            />
          )}
        </LoadScript>
      )}

      {layer === "services" && (
        <MapLegend
          serviceClasses={serviceClasses}
          activeFilters={activeServiceFilters}
          onToggle={toggleServiceFilter}
          counts={serviceCounts}
        />
      )}
      {layer === "expenditure" && (
        <MapLegend
          serviceClasses={expenditureCategories}
          activeFilters={activeExpenditureFilters}
          onToggle={toggleExpenditureFilter}
          counts={expenditureCounts}
        />
      )}
      <QuickJumpStrip />

      <ManifestoModal
        official={selectedOfficial}
        anchor={reviewAnchor}
        onClose={handleCloseLeaderCard}
      />
      {fanOut && (
        <LeaderFanOut
          key={fanOut.signature}
          officials={fanOut.officials}
          origin={fanOut.origin}
          radius={fanOut.radius}
          layout={fanOut.layoutMode}
          forceCollapse={fanOut.forceCollapse}
          onSelectLeader={handleSelectLeaderFromFanOut}
          onCollapse={() => setFanOut(null)}
        />
      )}
      <AmenityModal
        amenity={amenityDetail}
        onClose={() => setSelectedAmenityId(null)}
        onRatingSubmitted={refetchAmenityDetail}
      />
      <ExpenditureModal
        project={projectDetail}
        onClose={() => setSelectedProjectId(null)}
        onRatingSubmitted={refetchProjectDetail}
        onViewOwner={
          projectDetail && officials.some((o) => o.role === "governor" && o.county === projectDetail.county)
            ? () => handleViewOwner(projectDetail)
            : undefined
        }
      />
    </div>
  );
}
