"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import {
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

type CampusMapProps = {
  places: Place[];
  selectedPlace: Place | null;
  onSelect: (place: Place) => void;
};

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
  routeStart,
  routeVisible,
}: {
  place: Place | null;
  routeStart: Place | null;
  routeVisible: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (routeVisible && routeStart && place && routeStart.id !== place.id) {
      map.fitBounds([routeStart.coordinates, place.coordinates], {
        padding: [56, 56],
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
  }, [map, place, routeStart, routeVisible]);

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
}: CampusMapProps) {
  const [routeVisible, setRouteVisible] = useState(false);
  const [routeStartId, setRouteStartId] = useState("main-gate");
  const routeStart = allPlaces.find((place) => place.id === routeStartId) ?? allPlaces[0] ?? null;
  const routePositions = routeVisible && routeStart && selectedPlace && routeStart.id !== selectedPlace.id
    ? [routeStart.coordinates, selectedPlace.coordinates]
    : null;

  useEffect(() => {
    setRouteVisible(false);
    setRouteStartId("main-gate");
  }, [selectedPlace?.id]);

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
        setRouteVisible(true);
      }
    };

    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("change", onChange);
    };
  }, []);

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
      <MapViewport place={selectedPlace} routeStart={routeStart} routeVisible={routeVisible} />

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
          <CircleMarker
            center={routeStart!.coordinates}
            radius={8}
            pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#3157d5", fillOpacity: 1 }}
          >
            <Tooltip permanent direction="top" offset={[0, -8]} opacity={1}>Start</Tooltip>
          </CircleMarker>
        </>
      ) : null}

      <ZoomAwareMarkers places={places} selectedPlace={selectedPlace} onSelect={onSelect} />
    </MapContainer>
  );
}
