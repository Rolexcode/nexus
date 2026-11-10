"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, MapPin, Navigation, Search, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { lasuEpePlaces as places } from "@/data/lasu-epe";
import type { Place } from "@/lib/data";
import type { CampusRoute } from "@/lib/campus-routing";
import styles from "./map.module.css";

const CampusMap = dynamic(
  () => import("@/components/campus-map").then((module) => module.CampusMap),
  { ssr: false },
);

const suggestedPlaceIds = ["engineering-hall", "admin-block", "main-gate", "campus-library", "health-centre"];
const suggestedPlaces = suggestedPlaceIds
  .map((id) => places.find((place) => place.id === id))
  .filter((place): place is Place => Boolean(place));

export default function CampusMapPage() {
  const searchParams = useSearchParams();
  const initialPlaceId = searchParams.get("place");
  const initialPlace = places.find((place) => place.id === initialPlaceId) ?? null;
  const [query, setQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(initialPlace);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ route: CampusRoute | null; startMode: "live" | "gate" | "unavailable" }>({ route: null, startMode: "unavailable" });
  const handleRouteUpdate = useCallback((route: CampusRoute | null, startMode: "live" | "gate" | "unavailable") => {
    setRouteInfo({ route, startMode });
  }, []);

  const filteredPlaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return places;
    return places.filter((place) => [place.name, place.category, place.landmark, ...place.services]
      .join(" ")
      .toLowerCase()
      .includes(normalized));
  }, [query]);

  const selectPlace = (place: Place) => {
    setSelectedPlace(place);
    setDirectionsOpen(false);
    setRouteInfo({ route: null, startMode: "unavailable" });
    setQuery("");
  };

  return (
    <main className={styles.page}>
      <div className={styles.map}>
        <CampusMap places={filteredPlaces} selectedPlace={selectedPlace} onSelect={selectPlace} onRouteUpdate={handleRouteUpdate} />
      </div>

      <header className={styles.toolbar}>
        <Link href="/" className={styles.back} aria-label="Back to Nexus home">
          <ArrowLeft size={18} />
        </Link>
        <div className={styles.toolbarCopy}>
          <small>Campus map</small>
          <strong>LASU Epe</strong>
        </div>
      </header>

      <section className={styles.searchPanel} aria-label="Search campus places">
        <label className={styles.searchBox}>
          <Search size={19} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Where are you going?"
            type="search"
            autoComplete="off"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={17} /></button>
          ) : null}
        </label>

        {!query && !selectedPlace ? (
          <div className={styles.suggestions} aria-label="Suggested campus destinations">
            <span className={styles.suggestionLabel}>Popular destinations</span>
            <div className={styles.suggestionList}>
              {suggestedPlaces.map((place) => (
                <button key={place.id} type="button" onClick={() => selectPlace(place)}>
                  <MapPin size={14} />
                  {place.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {query ? (
          <div className={styles.results}>
            {filteredPlaces.slice(0, 6).map((place) => (
              <button key={place.id} type="button" onClick={() => selectPlace(place)}>
                <span className={styles.resultIcon}><MapPin size={16} /></span>
                <span><strong>{place.name}</strong><small>{place.category} · {place.landmark}</small></span>
              </button>
            ))}
            {!filteredPlaces.length ? <p>No campus place matches that search.</p> : null}
          </div>
        ) : null}
      </section>

      {!selectedPlace ? (
        <div className={styles.hint}>
          <Navigation size={16} />
          <span>Choose a suggested destination, search, or tap a pin.</span>
        </div>
      ) : (
        <aside className={styles.destinationCard} aria-label={`${selectedPlace.name} destination`}>
          <div className={styles.destinationTop}>
            <div>
              <small>{selectedPlace.category}</small>
              <h1>{selectedPlace.name}</h1>
              <p>{selectedPlace.landmark}</p>
            </div>
            <button type="button" className={styles.close} onClick={() => { setSelectedPlace(null); setDirectionsOpen(false); }} aria-label="Close destination">
              <X size={18} />
            </button>
          </div>

          <button
            type="button"
            className={`route-button ${styles.routeButton}`}
            aria-expanded={directionsOpen}
            onClick={() => setDirectionsOpen((open) => !open)}
          >
            <Navigation size={17} />
            {directionsOpen ? "Hide directions" : "Directions from my location"}
          </button>

          {directionsOpen ? (
            <div className={styles.directionPanel}>
              <div className={styles.directionHeader}>
                <span><small>Campus walking route</small><strong>To {selectedPlace.name}</strong></span>
                <span className="direction-time">{routeInfo.route ? `${Math.max(1, Math.ceil(routeInfo.route.distanceMetres / 75))} min` : "Route check"}</span>
              </div>
              {routeInfo.route ? (
                <>
                  <div className="direction-summary"><Navigation size={16} /><span>{routeInfo.startMode === "live" ? "A connected route was found from your current GPS position." : "Your current position is outside the mapped campus paths. This campus route starts at Main Gate."} About {routeInfo.route.distanceMetres} m along the digitised campus network.</span></div>
                  <ol className="direction-steps">
                    {routeInfo.route.steps.map((step, index) => <li key={index}>{step}</li>)}
                  </ol>
                  {routeInfo.startMode === "gate" ? (
                    <a className={styles.googleDirections} href="https://www.google.com/maps/dir/?api=1&destination=6.59195,3.99485&travelmode=walking" target="_blank" rel="noreferrer">
                      <Navigation size={17} /> Get to Main Gate first
                    </a>
                  ) : null}
                </>
              ) : (
                <div className="direction-summary"><Navigation size={16} /><span>Nexus could not confirm a continuous path between these points in the digitised network. We will not draw a straight line and label it as a walkable route.</span></div>
              )}
              <a className={styles.googleDirections} href={`https://www.google.com/maps/dir/?api=1&destination=${routeInfo.startMode === "gate" ? "6.59195,3.99485" : `${selectedPlace.coordinates[0]},${selectedPlace.coordinates[1]}`}&travelmode=walking`} target="_blank" rel="noreferrer">
                <Navigation size={17} /> {routeInfo.startMode === "gate" ? "Open route to campus entrance" : "Open walking directions in Google Maps"}
              </a>
              <p className="direction-disclaimer">Campus paths are a first-pass digitisation of the student map, not field-verified survey geometry. Distances and route steps are estimates. Please confirm junctions on site before relying on them for safety-critical travel.</p>
            </div>
          ) : null}
        </aside>
      )}
    </main>
  );
}
