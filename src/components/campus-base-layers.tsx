"use client";
import { TileLayer } from "react-leaflet";
export function CampusBaseLayers({mapStyle}:{mapStyle:"street"|"satellite"}){
 if(mapStyle==="satellite") return <TileLayer attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community" url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={18} maxZoom={20}/>;
 return <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxNativeZoom={19} maxZoom={20}/>;
}
