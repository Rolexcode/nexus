"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, MapPin, Navigation, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { lasuEpePlaces as places } from "@/data/lasu-epe";
import type { Place } from "@/lib/data";
import styles from "./map.module.css";

const CampusMap = dynamic(
  () => import("@/components/campus-map").then((module) => module.CampusMap),
  { ssr: false },
);

export default function CampusMapPage() {
  const searchParams = useSearchParams();
  const initialPlaceId = searchParams.get("place");
  const initialPlace = places.find((place) => place.id === initialPlaceId) ?? null;
  const [query, setQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(initialPlace);
  const [directionsOpen, setDirectionsOpen] = useState(false);

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
    setQuery("");
  };

  return (
    <main className={styles.page}>
      <div className={styles.map}>
        <CampusMap places={filteredPlaces} selectedPlace={selectedPlace} onSelect={selectPlace} />
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
          <span>Search above or tap a pin to choose a destination.</span>
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
                <span><small>Route</small><strong>To {selectedPlace.name}</strong></span>
                <span className="direction-time">—</span>
              </div>
              <label htmlFor="direction-start">Starting point</label>
              <select id="direction-start" defaultValue="main-gate">
                {places.filter((place) => place.dataQuality === "mapped").map((place) => (
                  <option value={place.id} key={place.id}>{place.name}</option>
                ))}
              </select>
              <div className="direction-summary"><Navigation size={16} /><span>Finding your current location…</span></div>
              <ol className="direction-steps"><li>Allow location access to start directions.</li></ol>
              <p className="direction-disclaimer">Nexus uses your live location when permission is available.</p>
            </div>
          ) : null}
        </aside>
      )}
    </main>
  );
}
