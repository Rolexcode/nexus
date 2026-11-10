"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  ScaleControl,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { CampusBaseLayers } from "./campus-base-layers";
import { lasuEpePlaces as allPlaces } from "@/data/lasu-epe";
import { lasuEpeRoads } from "@/data/lasu-epe-roads";
import { findCampusRoute, type CampusRoute } from "@/lib/campus-routing";
import {
  CAMPUS_CENTER,
  categoryClass,
  type Place,
} from "@/lib/data";

type Coordinates = [number, number];
type LocationState = "idle" | "locating" | "live" | "denied" | "unavailable";

type CampusMapProps = {
  places: Place[];
  selectedPlace: Place | null;
  onSelect: (place: Place) => void;
  onRouteUpdate?: (route: CampusRoute | null, startMode: "live" | "gate" | "unavailable") => void;
};

type LiveLocation = {
  coordinates: Coordinates;
  accuracy: number;
};

function ZoomAwareMarkers({
  places,
  selectedPlace,
  onSelect,
  onRouteUpdate,
}: CampusMapProps) {
  const map = useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });
  const [zoom, setZoom] = useState(map.getZoom());

  return places.map((place) => {
    const selected = selectedPlace?.id === place.id;
    const showLabel = selected || (zoom >= 19 && place.dataQuality === "mapped");

    return (
      <Marker
        key={place.id}
        position={place.coordinates}
        icon={makeIcon(place, selected)}
        eventHandlers={{ click: () => onSelect(place) }}
        title={place.name}
        alt={place.name}
        riseOnHover
      >
        <Popup>
          <strong>{place.name}</strong>
          <span>{place.category}</span>
        </Popup>
        {showLabel ? (
          <Tooltip
            permanent
            direction="top"
            offset={[0, -34]}
            className="campus-place-label"
            opacity={1}
          >
            {place.name}
          </Tooltip>
        ) : null}
      </Marker>
    );
  });
}

function MapViewport({
  place,
  routeCoordinates,
  routeVisible,
}: {
  place: Place | null;
  routeCoordinates: Coordinates[] | null;
  routeVisible: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (routeVisible && routeCoordinates?.length) {
      map.fitBounds(routeCoordinates, {
        padding: [64, 64],
        maxZoom: 19,
        animate: true,
        duration: 0.55,
      });
      return;
    }

    if (place) {
      map.flyTo(place.coordinates, 18, { duration: 0.6 });
    } else {
      map.flyTo(CAMPUS_CENTER, 16, { duration: 0.6 });
    }
  }, [map, place, routeCoordinates, routeVisible]);

  return null;
}

function makeIcon(place: Place, selected: boolean) {
  return L.divIcon({
    className: "nexus-map-marker-wrapper",
    html: `<span class="nexus-map-marker ${categoryClass[place.category]}${selected ? " selected" : ""}"><span></span></span>`,
    iconSize: [36, 44],
    iconAnchor: [18, 40],
    popupAnchor: [0, -36],
  });
}

export function CampusMap({
  places,
  selectedPlace,
  onSelect,
  onRouteUpdate,
}: CampusMapProps) {
  const [routeVisible, setRouteVisible] = useState(false);
  const [routeStartId] = useState("main-gate");
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null);

  const fallbackStart = allPlaces.find((place) => place.id === routeStartId) ?? allPlaces[0] ?? null;
  const liveRoute = useMemo(() => {
    if (!routeVisible || !liveLocation || !selectedPlace) return null;
    return findCampusRoute(liveLocation.coordinates, selectedPlace.coordinates);
  }, [liveLocation, routeVisible, selectedPlace]);
  const gateRoute = useMemo(() => {
    if (!routeVisible || !fallbackStart || !selectedPlace) return null;
    return findCampusRoute(fallbackStart.coordinates, selectedPlace.coordinates);
  }, [fallbackStart, routeVisible, selectedPlace]);
  const route = liveRoute ?? gateRoute;
  const routeStartMode: "live" | "gate" | "unavailable" = liveRoute ? "live" : gateRoute ? "gate" : "unavailable";
  const routeCoordinates = route?.coordinates ?? null;

  useEffect(() => {
    setRouteVisible(false);
    setLiveLocation(null);
    setLocationState("idle");
  }, [selectedPlace?.id]);

  useEffect(() => {
    onRouteUpdate?.(routeVisible ? route : null, routeVisible ? routeStartMode : "unavailable");
  }, [onRouteUpdate, route, routeStartMode, routeVisible]);

  useEffect(() => {
    if (!routeVisible) {
      setLiveLocation(null);
      setLocationState("idle");
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationState("unavailable");
      return;
    }

    setLocationState("locating");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLiveLocation({
          coordinates: [position.coords.latitude, position.coords.longitude],
          accuracy: Math.max(1, position.coords.accuracy),
        });
        setLocationState("live");
      },
      (error) => {
        setLiveLocation(null);
        setLocationState(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3_000,
        timeout: 15_000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [routeVisible]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const routeButton = target?.closest<HTMLButtonElement>(".route-button");
      if (!routeButton) return;
      window.setTimeout(() => {
        setRouteVisible(routeButton.getAttribute("aria-expanded") === "true");
      }, 0);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <MapContainer
      center={CAMPUS_CENTER}
      zoom={16}
      minZoom={15}
      maxZoom={20}
      zoomControl={false}
      className="campus-map"
      attributionControl
    >
      <CampusBaseLayers />
      <ZoomControl position="bottomright" />
      <ScaleControl position="bottomleft" imperial={false} />
      <MapViewport
        place={selectedPlace}
        routeCoordinates={routeCoordinates}
        routeVisible={routeVisible}
      />

      {lasuEpeRoads.map((road) => (
        <Polyline
          key={road.id}
          positions={road.coordinates}
          pathOptions={{
            color: "#263b31",
            weight: 4,
            opacity: 0.82,
            lineCap: "round",
            lineJoin: "round",
          }}
        >
          <Tooltip sticky>{road.name} · approximate mapped path</Tooltip>
        </Polyline>
      ))}

      {routeVisible && routeCoordinates ? (
        <>
          <Polyline
            positions={routeCoordinates}
            pathOptions={{ color: "#ffffff", weight: 11, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
          />
          <Polyline
            positions={routeCoordinates}
            pathOptions={{ color: "#3157d5", weight: 6, opacity: 1, lineCap: "round", lineJoin: "round" }}
          />
        </>
      ) : null}

      {routeVisible && routeStartMode === "live" && liveLocation ? (
        <>
          <Circle
            center={liveLocation.coordinates}
            radius={liveLocation.accuracy}
            pathOptions={{ color: "#3157d5", weight: 1, opacity: 0.3, fillColor: "#3157d5", fillOpacity: 0.08 }}
          />
          <CircleMarker
            center={liveLocation.coordinates}
            radius={9}
            pathOptions={{ color: "#ffffff", weight: 4, fillColor: "#3157d5", fillOpacity: 1 }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]} opacity={1}>You are here</Tooltip>
            <Popup>Your current location · ±{Math.round(liveLocation.accuracy)} m</Popup>
          </CircleMarker>
        </>
      ) : routeVisible && routeStartMode === "gate" && fallbackStart ? (
        <CircleMarker
          center={fallbackStart.coordinates}
          radius={8}
          pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#3157d5", fillOpacity: 1 }}
        >
          <Tooltip permanent direction="top" offset={[0, -8]} opacity={1}>{fallbackStart.name}</Tooltip>
        </CircleMarker>
      ) : null}

      <ZoomAwareMarkers places={places} selectedPlace={selectedPlace} onSelect={onSelect} />
    </MapContainer>
  );
}
