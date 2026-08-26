"use client";

import { LayersControl, TileLayer } from "react-leaflet";

export function CampusBaseLayers() {
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked name="Satellite">
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
          url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={19}
          maxZoom={20}
        />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer name="Street map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxNativeZoom={19}
          maxZoom={20}
        />
      </LayersControl.BaseLayer>
    </LayersControl>
  );
}
