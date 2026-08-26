"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  ScaleControl,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { CampusBaseLayers } from "./campus-base-layers";
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
}: Omit<CampusMapProps, "routeActive">) {
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
      <ScaleControl position="bottomleft" imperial={false} />
      <MapFocus place={selectedPlace} />
      <ZoomAwareMarkers places={places} selectedPlace={selectedPlace} onSelect={onSelect} />
    </MapContainer>
  );
}
