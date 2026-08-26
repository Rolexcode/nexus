"use client";

import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import { CampusBaseLayers } from "./campus-base-layers";
import {
  CAMPUS_CENTER,
  CAMPUS_GATE,
  categoryClass,
  type Place,
} from "@/lib/data";

type CampusMapProps = {
  places: Place[];
  selectedPlace: Place | null;
  routeActive: boolean;
  onSelect: (place: Place) => void;
};

function MapFocus({ place }: { place: Place | null }) {
  const map = useMap();

  useEffect(() => {
    if (place) {
      map.flyTo(place.coordinates, 18, { duration: 0.6 });
    } else {
      map.flyTo(CAMPUS_CENTER, 17, { duration: 0.6 });
    }
  }, [map, place]);

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
  routeActive,
  onSelect,
}: CampusMapProps) {
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
      <MapFocus place={selectedPlace} />

      {places.map((place) => (
        <Marker
          key={place.id}
          position={place.coordinates}
          icon={makeIcon(place, selectedPlace?.id === place.id)}
          eventHandlers={{ click: () => onSelect(place) }}
          title={place.name}
          alt={place.name}
          riseOnHover
        >
          <Popup>
            <strong>{place.name}</strong>
            <span>{place.category}</span>
          </Popup>
          {place.dataQuality === "mapped" ? (
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
      ))}

      {routeActive && selectedPlace ? (
        <Polyline
          positions={[CAMPUS_GATE, selectedPlace.coordinates]}
          pathOptions={{ color: "#171717", weight: 5, opacity: 0.85, dashArray: "3 9" }}
        />
      ) : null}
    </MapContainer>
  );
}
