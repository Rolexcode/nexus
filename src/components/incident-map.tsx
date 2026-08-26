"use client";

import { useEffect } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  ZoomControl,
  useMap,
} from "react-leaflet";
import { CAMPUS_CENTER, type Incident } from "@/lib/data";
import { CampusBaseLayers } from "./campus-base-layers";

type IncidentMapProps = {
  incidents: Incident[];
  selectedId?: string;
  heatmap?: boolean;
  onSelect?: (incident: Incident) => void;
};

const severityColor: Record<Incident["severity"], string> = {
  Low: "#27718e",
  Medium: "#b76016",
  High: "#b83e50",
};

function IncidentFocus({ incident }: { incident?: Incident }) {
  const map = useMap();
  useEffect(() => {
    if (incident) map.flyTo(incident.coordinates, 18, { duration: 0.6 });
  }, [incident, map]);
  return null;
}

export function IncidentMap({ incidents, selectedId, heatmap = false, onSelect }: IncidentMapProps) {
  const selected = incidents.find((incident) => incident.id === selectedId);

  return (
    <MapContainer
      center={CAMPUS_CENTER}
      zoom={17}
      minZoom={15}
      maxZoom={20}
      zoomControl={false}
      className="campus-map"
    >
      <CampusBaseLayers />
      <ZoomControl position="bottomright" />
      <IncidentFocus incident={selected} />
      {incidents.map((incident) => (
        heatmap ? (
          <Circle
            key={incident.id}
            center={incident.coordinates}
            radius={38 + incident.confirmations * 7}
            pathOptions={{
              color: severityColor[incident.severity],
              fillColor: severityColor[incident.severity],
              fillOpacity: incident.status === "Resolved" ? 0.12 : 0.3,
              opacity: incident.status === "Resolved" ? 0.3 : 0.72,
              weight: selectedId === incident.id ? 3 : 1,
            }}
            eventHandlers={{ click: () => onSelect?.(incident) }}
          >
            <Popup><strong>{incident.title}</strong><span>{incident.confirmations} confirmations · {incident.status}</span></Popup>
          </Circle>
        ) : (
          <CircleMarker
            key={incident.id}
            center={incident.coordinates}
            radius={selectedId === incident.id ? 13 : 10}
            pathOptions={{
              color: "#ffffff",
              fillColor: severityColor[incident.severity],
              fillOpacity: incident.status === "Resolved" ? 0.45 : 0.95,
              opacity: 1,
              weight: 3,
            }}
            eventHandlers={{ click: () => onSelect?.(incident) }}
          >
            <Popup><strong>{incident.title}</strong><span>{incident.severity} priority · {incident.status}</span></Popup>
          </CircleMarker>
        )
      ))}
    </MapContainer>
  );
}
