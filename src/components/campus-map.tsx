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
};

type LiveLocation = {
  coordinates: Coordinates;
  accuracy: number;
};

function distanceMetres(from: Coordinates, to: Coordinates) {
  const earthRadius = 6_371_000;
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(to[0] - from[0]);
  const longitudeDelta = radians(to[1] - from[1]);
  const fromLatitude = radians(from[0]);
  const toLatitude = radians(to[0]);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
}

function ZoomAwareMarkers({
  places,
  selectedPlace,
  onSelect,
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
  routeStartCoordinates,
  routeVisible,
}: {
  place: Place | null;
  routeStartCoordinates: Coordinates | null;
  routeVisible: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (routeVisible && routeStartCoordinates && place) {
      map.fitBounds([routeStartCoordinates, place.coordinates], {
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
      map.flyTo(CAMPUS_CENTER, 17, { duration: 0.6 });
    }
  }, [map, place, routeStartCoordinates, routeVisible]);

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

function syncDirectionPanel(
  state: LocationState,
  liveLocation: LiveLocation | null,
  destination: Place | null,
) {
  const label = document.querySelector<HTMLLabelElement>('label[for="direction-start"]');
  const select = document.querySelector<HTMLSelectElement>("#direction-start");
  const summary = document.querySelector<HTMLElement>(".direction-summary span");
  const time = document.querySelector<HTMLElement>(".direction-time");
  const steps = document.querySelector<HTMLOListElement>(".direction-steps");
  const disclaimer = document.querySelector<HTMLElement>(".direction-disclaimer");

  if (!label || !select) return;

  if (state === "locating") {
    label.textContent = "Starting point — finding your location…";
    select.disabled = true;
    return;
  }

  if (state === "live" && liveLocation && destination) {
    label.textContent = "Starting point — your live location";
    select.disabled = true;
    const metres = Math.round(distanceMetres(liveLocation.coordinates, destination.coordinates));
    const minutes = Math.max(1, Math.ceil(metres / 75));
    if (summary) summary.innerHTML = `<strong>${metres} m</strong> from your current position`;
    if (time) time.textContent = `${minutes} min`;
    if (steps) {
      steps.innerHTML = [
        "Start from your current GPS position.",
        `Follow the highlighted line toward ${destination.name}.`,
        `Use ${destination.landmark} as your final landmark.`,
        `Arrive at ${destination.name}.`,
      ].map((step) => `<li>${step}</li>`).join("");
    }
    if (disclaimer) {
      disclaimer.textContent = "Your position updates while directions are open. The current line connects you to the destination; exact walkway turns will be added as campus paths are mapped.";
    }
    return;
  }

  select.disabled = false;
  if (state === "denied") label.textContent = "Starting point — location permission denied";
  else if (state === "unavailable") label.textContent = "Starting point — live location unavailable";
  else label.textContent = "Starting point";
}

export function CampusMap({
  places,
  selectedPlace,
  onSelect,
}: CampusMapProps) {
  const [routeVisible, setRouteVisible] = useState(false);
  const [routeStartId, setRouteStartId] = useState("main-gate");
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null);

  const fallbackStart = allPlaces.find((place) => place.id === routeStartId) ?? allPlaces[0] ?? null;
  const routeStartCoordinates = liveLocation?.coordinates
    ?? ((locationState === "denied" || locationState === "unavailable") ? fallbackStart?.coordinates ?? null : null);

  const routePositions = useMemo(() => {
    if (!routeVisible || !routeStartCoordinates || !selectedPlace) return null;
    if (distanceMetres(routeStartCoordinates, selectedPlace.coordinates) < 4) return null;
    return [routeStartCoordinates, selectedPlace.coordinates] as Coordinates[];
  }, [routeStartCoordinates, routeVisible, selectedPlace]);

  useEffect(() => {
    setRouteVisible(false);
    setRouteStartId("main-gate");
    setLiveLocation(null);
    setLocationState("idle");
  }, [selectedPlace?.id]);

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
    if (!routeVisible) return;
    const timer = window.setTimeout(() => {
      syncDirectionPanel(locationState, liveLocation, selectedPlace);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [liveLocation, locationState, routeVisible, selectedPlace]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const routeButton = target?.closest<HTMLButtonElement>(".route-button");
      if (!routeButton) return;
      window.setTimeout(() => {
        setRouteVisible(routeButton.getAttribute("aria-expanded") === "true");
      }, 0);
    };

    const onChange = (event: Event) => {
      const target = event.target as HTMLSelectElement | null;
      if (target?.id === "direction-start") {
        setRouteStartId(target.value);
        if (locationState !== "live") setRouteVisible(true);
      }
    };

    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("change", onChange);
    };
  }, [locationState]);

  return (
    <MapContainer
      center={CAMPUS_CENTER}
      zoom={17}
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
        routeStartCoordinates={routeStartCoordinates}
        routeVisible={routeVisible}
      />

      {routePositions ? (
        <>
          <Polyline
            positions={routePositions}
            pathOptions={{ color: "#ffffff", weight: 10, opacity: 0.92, lineCap: "round", lineJoin: "round" }}
          />
          <Polyline
            positions={routePositions}
            pathOptions={{ color: "#3157d5", weight: 6, opacity: 1, lineCap: "round", lineJoin: "round" }}
          />
        </>
      ) : null}

      {routeVisible && liveLocation ? (
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
      ) : routeVisible && routeStartCoordinates && fallbackStart ? (
        <CircleMarker
          center={routeStartCoordinates}
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
