"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  Cross,
  EyeOff,
  FileImage,
  Flame,
  GraduationCap,
  Layers3,
  LockKeyhole,
  LocateFixed,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  Plus,
  Radio,
  Route,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  School,
  Store,
  Utensils,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { lasuEpePlaces as places } from "@/data/lasu-epe";
import { buildCampusDirectionPlan } from "@/lib/campus-directions";
import {
  NEXUS_CAMPUS_ID,
  getCampus,
  getInstitution,
  institutions,
  isNexusCampusMember,
} from "@/lib/campuses";
import {
  categories,
  categoryClass,
  incidentCategories,
  initialIncidents,
  type Incident,
  type AttestationKind,
  type IncidentAttestation,
  type IncidentStatus,
  type Place,
  type PlaceCategory,
} from "@/lib/data";
import { useLocalStorageState } from "@/lib/use-local-storage-state";

const CampusMap = dynamic(
  () => import("./campus-map").then((module) => module.CampusMap),
  {
    ssr: false,
    loading: () => (
      <div className="map-loading" aria-live="polite">
        <div className="map-loading-grid" />
        <div>
          <span className="map-loading-dot" />
          Loading campus map…
        </div>
      </div>
    ),
  },
);

const IncidentMap = dynamic(
  () => import("./incident-map").then((module) => module.IncidentMap),
  {
    ssr: false,
    loading: () => (
      <div className="map-loading" aria-live="polite">
        <div className="map-loading-grid" />
        <div><span className="map-loading-dot" /> Loading incident map…</div>
      </div>
    ),
  },
);

type View = "explore" | "services" | "reports" | "admin" | "provider";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  matricNumber: string;
  institutionId: string;
  campusId: string;
  department: string;
  level: string;
  membershipStatus: "demo-verified";
};

type AccountForm = Omit<UserProfile, "id" | "membershipStatus">;

const emptyAccountForm: AccountForm = {
  name: "",
  email: "",
  matricNumber: "",
  institutionId: "lasu",
  campusId: NEXUS_CAMPUS_ID,
  department: "",
  level: "",
};

type PendingAction = {
  action: (profile: UserProfile) => void;
  campusOnly: boolean;
};

const categoryIcons: Record<PlaceCategory, typeof GraduationCap> = {
  Academic: GraduationCap,
  Administration: Building2,
  "Food & drink": Utensils,
  Health: Cross,
  Transport: Navigation,
  Community: MapPin,
  "Business & service": ShoppingBag,
};

function NexusMark() {
  return (
    <div className="nexus-mark" aria-hidden="true">
      <span>N</span>
    </div>
  );
}

function CategoryIcon({ category }: { category: PlaceCategory }) {
  const Icon = categoryIcons[category];
  return (
    <span className={`category-icon ${categoryClass[category]}`}>
      <Icon size={17} aria-hidden="true" />
    </span>
  );
}

function Header({
  view,
  user,
  onViewChange,
  onAccount,
}: {
  view: View;
  user: UserProfile | null;
  onViewChange: (view: View) => void;
  onAccount: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const selectView = (nextView: View) => {
    onViewChange(nextView);
    setMenuOpen(false);
  };

  return (
    <header className="site-header">
      <button
        type="button"
        className="brand-button"
        onClick={() => selectView("explore")}
        aria-label="Go to Nexus explore"
      >
        <NexusMark />
        <span>
          <strong>Nexus</strong>
          <small>LASU Epe</small>
        </span>
      </button>

      <nav className="desktop-nav" aria-label="Primary navigation">
        <button
          type="button"
          className={view === "explore" ? "active" : ""}
          onClick={() => selectView("explore")}
        >
          Explore campus
        </button>
        <button
          type="button"
          className={view === "services" ? "active" : ""}
          onClick={() => selectView("services")}
        >
          Services
        </button>
        <button
          type="button"
          className={view === "reports" ? "active" : ""}
          onClick={() => selectView("reports")}
        >
          Report & track
        </button>
        <button
          type="button"
          className={view === "admin" ? "active" : ""}
          onClick={() => selectView("admin")}
        >
          Admin view
        </button>
      </nav>

      <div className="header-actions">
        <span className="beta-badge">Prototype · Demo data</span>
        <button
          type="button"
          className="secondary-button header-provider"
          onClick={() => selectView("provider")}
        >
          <Plus size={17} aria-hidden="true" />
          List a service
        </button>
        <button type="button" className="account-button" onClick={onAccount}>
          <UserRound size={17} aria-hidden="true" />
          {user ? user.name.split(" ")[0] : "Sign in"}
        </button>
        <button
          type="button"
          className="icon-button mobile-menu-button"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {menuOpen ? (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button type="button" onClick={() => selectView("explore")}>Explore campus</button>
          <button type="button" onClick={() => selectView("services")}>Services</button>
          <button type="button" onClick={() => selectView("reports")}>Report & track</button>
          <button type="button" onClick={() => selectView("admin")}>Admin view</button>
          <button type="button" onClick={() => selectView("provider")}>List a service</button>
          <button type="button" onClick={() => { onAccount(); setMenuOpen(false); }}>
            {user ? "My account" : "Sign in"}
          </button>
        </nav>
      ) : null}
    </header>
  );
}

function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="search-wrap">
      <label htmlFor="campus-search">Search the campus</label>
      <div className="search-field">
        <Search size={20} aria-hidden="true" />
        <input
          id="campus-search"
          type="search"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Try “printing”, “lecture theatre” or “food”"
        />
        {value ? (
          <button type="button" aria-label="Clear search" onClick={() => onChange("")}>
            <X size={17} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PlaceCard({
  place,
  selected,
  onSelect,
}: {
  place: Place;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`place-card${selected ? " selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <CategoryIcon category={place.category} />
      <span className="place-copy">
        <span className="place-title-row">
          <strong>{place.name}</strong>
          {place.dataQuality === "mapped" ? (
            <span className="verified-label">
              <ShieldCheck size={13} aria-hidden="true" /> Mapped
            </span>
          ) : null}
        </span>
        <small>{place.category} · {place.walkMinutes} min from gate</small>
        <span>{place.services.slice(0, 3).join(" · ")}</span>
      </span>
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  );
}

function PlaceDetails({
  place,
  saved,
  onToggleSave,
  onClose,
}: {
  place: Place;
  saved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
}) {
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [startPlaceId, setStartPlaceId] = useState("main-gate");
  const startPlace = places.find((item) => item.id === startPlaceId) ?? places[0];
  const directionPlan = buildCampusDirectionPlan(startPlace, place);

  return (
    <aside className="place-details" aria-label={`${place.name} details`}>
      <div className="details-heading">
        <CategoryIcon category={place.category} />
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close place details">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <span className="eyebrow">{place.category}</span>
      <h2>{place.name}</h2>
      <p>{place.description}</p>

      <div className="detail-meta">
        <div>
          <MapPin size={17} aria-hidden="true" />
          <span><strong>Landmark</strong>{place.landmark}</span>
        </div>
        <div>
          <Clock3 size={17} aria-hidden="true" />
          <span><strong>Hours</strong>{place.hours}</span>
        </div>
      </div>

      <div className="service-tags" aria-label="Available services">
        {place.services.map((service) => <span key={service}>{service}</span>)}
      </div>

      {place.announcement ? (
        <div className="announcement">
          <span>Latest update</span>
          <p>{place.announcement}</p>
        </div>
      ) : null}

      {place.dataQuality === "demo" ? (
        <div className="data-note">
          <CircleHelp size={16} aria-hidden="true" />
          <p><strong>Demo pin</strong> · Exact coordinates need on-campus verification.</p>
        </div>
      ) : null}

      <div className="details-actions">
        <button className="primary-button route-button" type="button" onClick={() => setDirectionsOpen((open) => !open)} aria-expanded={directionsOpen}>
          <Route size={18} aria-hidden="true" />
          {directionsOpen ? "Hide directions" : "Directions"}
        </button>
        <button className="secondary-button save-place-button" type="button" onClick={onToggleSave} aria-pressed={saved}>
          <Bookmark size={17} aria-hidden="true" fill={saved ? "currentColor" : "none"} />
          {saved ? "Saved" : "Save place"}
        </button>
      </div>

      {directionsOpen ? (
        <section className="direction-panel" aria-labelledby="direction-heading">
          <div className="direction-heading">
            <div>
              <span className="eyebrow">On-campus preview</span>
              <h3 id="direction-heading">Route to {place.name}</h3>
            </div>
            <span className="direction-time">{directionPlan.walkingMinutes} min</span>
          </div>
          <label htmlFor="direction-start">Starting point</label>
          <select id="direction-start" value={startPlaceId} onChange={(event) => setStartPlaceId(event.target.value)}>
            {places.filter((item) => item.dataQuality === "mapped").map((item) => (
              <option value={item.id} key={item.id}>{item.name}</option>
            ))}
          </select>
          <div className="direction-summary">
            <Navigation size={17} aria-hidden="true" />
            <span><strong>{directionPlan.distanceMetres} m</strong> approximate direct distance · head {directionPlan.direction}</span>
          </div>
          <ol className="direction-steps">
            {directionPlan.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <p className="direction-disclaimer"><CircleHelp size={14} aria-hidden="true" /> This preview uses verified place pins, not yet the surveyed walkway network. Confirm paths on the ground.</p>
        </section>
      ) : null}
    </aside>
  );
}

function ExploreView({
  selectedPlaceId,
  savedPlaceIds,
  onSelectPlace,
  onToggleSave,
}: {
  selectedPlaceId: string | null;
  savedPlaceIds: string[];
  onSelectPlace: (place: Place | null) => void;
  onToggleSave: (place: Place) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? null;

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return places.filter((place) => {
      const matchesCategory = category === "All" || place.category === category;
      const haystack = [place.name, place.category, place.description, ...place.services]
        .join(" ")
        .toLowerCase();
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [category, query]);
  const visibleSelectedPlace = selectedPlace && filteredPlaces.some((place) => place.id === selectedPlace.id)
    ? selectedPlace
    : null;

  const selectPlace = (place: Place) => onSelectPlace(place);

  return (
    <main className="explore-page">
      <section className="explore-panel" aria-label="Campus search and results">
        <div className="explore-intro">
          <span className="location-line"><LocateFixed size={15} aria-hidden="true" /> LASU Epe Campus</span>
          <h1>Find your way.<br />Know what’s there.</h1>
          <p>Campus places, useful services and current information in one trusted guide.</p>
        </div>

        <SearchField value={query} onChange={setQuery} />

        <div className="filter-header">
          <span><SlidersHorizontal size={16} aria-hidden="true" /> Filter</span>
          <small>{filteredPlaces.length} places</small>
        </div>
        <div className="category-scroll" aria-label="Place categories">
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              className={category === item ? "active" : ""}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="results-list" aria-live="polite">
          {filteredPlaces.length ? (
            filteredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                selected={selectedPlace?.id === place.id}
                onSelect={() => selectPlace(place)}
              />
            ))
          ) : (
            <div className="empty-state">
              <Compass size={28} aria-hidden="true" />
              <strong>No campus place matches that search</strong>
              <p>Try a service such as “printing”, “food” or “lecture”.</p>
              <button type="button" className="secondary-button" onClick={() => { setQuery(""); setCategory("All"); }}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="map-stage" aria-label="Interactive campus map">
        <CampusMap
          places={filteredPlaces}
          selectedPlace={visibleSelectedPlace}
          onSelect={selectPlace}
        />
        <div className="map-context">
          <Layers3 size={15} aria-hidden="true" />
          LASU Epe · satellite campus map
        </div>
        <div className="map-legend" aria-label="Map data note">
          <ShieldCheck size={15} aria-hidden="true" />
          Familiar campus names · marker alignment is being verified
        </div>
        {visibleSelectedPlace ? (
          <PlaceDetails
            place={visibleSelectedPlace}
            saved={savedPlaceIds.includes(visibleSelectedPlace.id)}
            onToggleSave={() => onToggleSave(visibleSelectedPlace)}
            onClose={() => onSelectPlace(null)}
          />
        ) : null}
      </section>
    </main>
  );
}

function ServicesView({
  onListService,
  onViewPlace,
}: {
  onListService: () => void;
  onViewPlace: (place: Place) => void;
}) {
  const [query, setQuery] = useState("");
  const servicePlaces = places.filter((place) => place.provider);
  const filtered = servicePlaces.filter((place) =>
    [place.name, place.description, ...place.services]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  return (
    <main className="content-page">
      <section className="page-hero">
        <span className="eyebrow">Campus services</span>
        <h1>What do you need today?</h1>
        <p>Discover practical services around LASU Epe and see what providers currently offer.</p>
        <SearchField value={query} onChange={setQuery} />
      </section>

      <section className="services-section" aria-labelledby="services-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Nearby</span>
            <h2 id="services-heading">Services around campus</h2>
          </div>
          <button className="secondary-button" type="button" onClick={onListService}>
            <Store size={17} aria-hidden="true" />
            Add your service
          </button>
        </div>

        <div className="service-grid">
          {filtered.length ? filtered.map((place) => (
            <article className="service-card" key={place.id}>
              <div className="service-card-top">
                <CategoryIcon category={place.category} />
                <span className="demo-label">Demo listing</span>
              </div>
              <h3>{place.name}</h3>
              <p>{place.description}</p>
              <div className="service-tags">
                {place.services.map((service) => <span key={service}>{service}</span>)}
              </div>
              <div className="service-update">
                <span>Latest update</span>
                <p>{place.announcement}</p>
              </div>
              <div className="service-card-footer">
                <span><Clock3 size={15} aria-hidden="true" /> {place.hours}</span>
                <button type="button" onClick={() => onViewPlace(place)} aria-label={`View ${place.name} on the campus map`}>
                  View on map <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </article>
          )) : (
            <div className="empty-state wide">
              <Store size={30} aria-hidden="true" />
              <strong>No service matches “{query}”</strong>
              <p>Try “printing”, “stationery” or “food”.</p>
              <button className="secondary-button" type="button" onClick={() => setQuery("")}>Clear search</button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function StatusPill({ status }: { status: IncidentStatus }) {
  return <span className={`status-pill ${status.toLowerCase().replace(" ", "-")}`}>{status}</span>;
}

function IncidentCard({
  incident,
  selected,
  attestation,
  ownReport,
  onSelect,
  onAttest,
}: {
  incident: Incident;
  selected: boolean;
  attestation?: IncidentAttestation;
  ownReport: boolean;
  onSelect: () => void;
  onAttest: () => void;
}) {
  return (
    <article className={`incident-card${selected ? " selected" : ""}`}>
      <button className="incident-select" type="button" onClick={onSelect}>
        <span className={`severity-mark ${incident.severity.toLowerCase()}`} aria-hidden="true" />
        <span className="incident-copy">
          <span className="incident-topline">
            <small>{incident.category} · {incident.reportedAt}</small>
            <StatusPill status={incident.status} />
          </span>
          <strong>{incident.title}</strong>
          <span>{incident.landmark}</span>
        </span>
        <ChevronRight size={17} aria-hidden="true" />
      </button>
      <div className="incident-card-footer">
        <span><Radio size={14} aria-hidden="true" /> {incident.confirmations} student attestations</span>
        {incident.status !== "Resolved" ? (
          <button type="button" onClick={onAttest} disabled={Boolean(attestation) || ownReport}>
            {attestation || ownReport ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
            {ownReport ? "Your report" : attestation ? "Attested" : "Attest"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

type IncidentDraft = {
  category: Incident["category"];
  title: string;
  description: string;
  landmark: string;
  placeId: string;
  anonymous: boolean;
  fileName: string;
};

const emptyIncidentDraft: IncidentDraft = {
  category: "Infrastructure",
  title: "",
  description: "",
  landmark: "",
  placeId: "engineering-hall",
  anonymous: true,
  fileName: "",
};

function IncidentReportForm({
  reporter,
  onCancel,
  onSubmit,
}: {
  reporter: UserProfile;
  onCancel: () => void;
  onSubmit: (incident: Incident) => void;
}) {
  const [draft, setDraft] = useState<IncidentDraft>(emptyIncidentDraft);
  const [errors, setErrors] = useState<Partial<Record<keyof IncidentDraft, string>>>({});

  const update = <K extends keyof IncidentDraft>(field: K, value: IncidentDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof IncidentDraft, string>> = {};
    if (!draft.title.trim()) nextErrors.title = "Give the issue a short, specific title.";
    if (!draft.description.trim()) nextErrors.description = "Describe what happened and why it matters.";
    if (!draft.landmark.trim()) nextErrors.landmark = "Add a nearby landmark so officials can find it.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      document.getElementById(`incident-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }
    onSubmit({
      id: `incident-${Date.now()}`,
      title: draft.title.trim(),
      category: draft.category,
      description: draft.description.trim(),
      coordinates: places.find((place) => place.id === draft.placeId)?.coordinates ?? [6.59402, 3.99562],
      landmark: draft.landmark.trim(),
      reportedAt: "Just now",
      confirmations: 1,
      severity: draft.category === "Safety" || draft.category === "Electrical hazard" ? "High" : "Medium",
      status: "Reported",
      anonymous: draft.anonymous,
      campusId: reporter.campusId,
      reportedBy: reporter.id,
      evidenceLabel: draft.fileName ? `Photo selected: ${draft.fileName}` : undefined,
    });
  };

  return (
    <section className="incident-form-card" aria-labelledby="incident-form-heading">
      <div className="incident-form-header">
        <div>
          <span className="eyebrow">New campus report</span>
          <h2 id="incident-form-heading">What needs attention?</h2>
        </div>
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Close report form">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <form onSubmit={submit} noValidate>
        <div className="campus-boundary-note">
          <School size={17} aria-hidden="true" />
          <span><strong>LASU Epe report</strong>This report is tied to your verified demo campus membership.</span>
        </div>
        <div className="field-group">
          <label htmlFor="incident-category">Issue category <span>*</span></label>
          <select id="incident-category" value={draft.category} onChange={(event) => update("category", event.target.value as Incident["category"])}>
            {incidentCategories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="incident-title">Short title <span>*</span></label>
          <input
            id="incident-title"
            type="text"
            value={draft.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="e.g. Burst pipe beside hostel walkway"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "incident-title-error" : undefined}
          />
          {errors.title ? <p className="field-error" id="incident-title-error">{errors.title}</p> : null}
        </div>
        <div className="field-group">
          <label htmlFor="incident-description">What happened? <span>*</span></label>
          <textarea
            id="incident-description"
            rows={3}
            value={draft.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Describe the issue, immediate risk and anything officials should know."
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? "incident-description-error" : undefined}
          />
          {errors.description ? <p className="field-error" id="incident-description-error">{errors.description}</p> : null}
        </div>
        <div className="field-group">
          <label htmlFor="incident-placeId">Pin report near <span>*</span></label>
          <select id="incident-placeId" value={draft.placeId} onChange={(event) => update("placeId", event.target.value)}>
            {places.filter((place) => place.dataQuality === "mapped").map((place) => (
              <option value={place.id} key={place.id}>{place.name}</option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="incident-landmark">Nearest landmark <span>*</span></label>
          <input
            id="incident-landmark"
            type="text"
            value={draft.landmark}
            onChange={(event) => update("landmark", event.target.value)}
            placeholder="Behind Hostel Block C"
            aria-invalid={Boolean(errors.landmark)}
            aria-describedby={errors.landmark ? "incident-landmark-error" : undefined}
          />
          {errors.landmark ? <p className="field-error" id="incident-landmark-error">{errors.landmark}</p> : null}
        </div>
        <div className="photo-field">
          <div><Camera size={18} aria-hidden="true" /><span><strong>Add evidence</strong><small>One clear photo helps officials assess the issue.</small></span></div>
          <label htmlFor="incident-photo">{draft.fileName ? "Change photo" : "Choose photo"}</label>
          <input
            id="incident-photo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => update("fileName", event.target.files?.[0]?.name ?? "")}
          />
          {draft.fileName ? <p><FileImage size={14} aria-hidden="true" /> {draft.fileName}</p> : null}
        </div>
        <label className="privacy-toggle">
          <input type="checkbox" checked={draft.anonymous} onChange={(event) => update("anonymous", event.target.checked)} />
          <span><EyeOff size={18} aria-hidden="true" /><span><strong>Hide my name publicly</strong><small>Campus officials can still see the verified account behind this report.</small></span></span>
        </label>
        <div className="incident-form-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
          <button className="primary-button" type="submit"><Send size={17} aria-hidden="true" /> Submit report</button>
        </div>
      </form>
    </section>
  );
}

function ReportsView({
  incidents,
  user,
  attestations,
  onAddIncident,
  onRequestAttestation,
  onRequestReport,
}: {
  incidents: Incident[];
  user: UserProfile | null;
  attestations: IncidentAttestation[];
  onAddIncident: (incident: Incident) => void;
  onRequestAttestation: (incident: Incident) => void;
  onRequestReport: (openForm: () => void) => void;
}) {
  const [selectedId, setSelectedId] = useState(incidents[0]?.id);
  const [formOpen, setFormOpen] = useState(false);
  const selected = incidents.find((incident) => incident.id === selectedId);

  const add = (incident: Incident) => {
    onAddIncident(incident);
    setSelectedId(incident.id);
    setFormOpen(false);
  };

  return (
    <main className="incident-page">
      <section className="incident-sidebar">
        <div className="incident-intro">
          <span className="location-line"><Radio size={15} aria-hidden="true" /> Live campus reports</span>
          <h1>See it. Pin it.<br />Get it resolved.</h1>
          <p>Turn scattered campus complaints into verified, actionable reports.</p>
          <button className="primary-button" type="button" onClick={() => onRequestReport(() => setFormOpen(true))}>
            <Plus size={18} aria-hidden="true" /> Report an issue
          </button>
        </div>
        <div className="trust-strip">
          <LockKeyhole size={17} aria-hidden="true" />
          <p><strong>Private identity, public accountability.</strong> Reporter details stay visible only to authorised campus officials.</p>
        </div>
        <div className="incident-list" aria-live="polite">
          {incidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              selected={selectedId === incident.id}
              attestation={attestations.find((item) => item.incidentId === incident.id && item.userId === user?.id)}
              ownReport={Boolean(user && incident.reportedBy === user.id)}
              onSelect={() => setSelectedId(incident.id)}
              onAttest={() => onRequestAttestation(incident)}
            />
          ))}
        </div>
      </section>
      <section className="incident-map-stage" aria-label="Campus incident map">
        <IncidentMap incidents={incidents} selectedId={selectedId} onSelect={(incident) => setSelectedId(incident.id)} />
        <div className="incident-map-key">
          <span><i className="high" /> High</span>
          <span><i className="medium" /> Medium</span>
          <span><i className="low" /> Low</span>
        </div>
        {selected ? (
          <aside className="incident-details">
            <div className="incident-detail-topline">
              <span className={`severity-label ${selected.severity.toLowerCase()}`}>{selected.severity} priority</span>
              <StatusPill status={selected.status} />
            </div>
            <h2>{selected.title}</h2>
            <p>{selected.description}</p>
            <div className="incident-detail-meta">
              <span><MapPin size={16} aria-hidden="true" /> {selected.landmark}</span>
              <span><Clock3 size={16} aria-hidden="true" /> Reported {selected.reportedAt}</span>
              <span><Radio size={16} aria-hidden="true" /> {selected.confirmations} student attestations</span>
              {selected.evidenceLabel ? <span><Camera size={16} aria-hidden="true" /> {selected.evidenceLabel}</span> : null}
            </div>
            <div className="status-path" aria-label={`Incident status: ${selected.status}`}>
              {(["Reported", "Verified", "In progress", "Resolved"] as IncidentStatus[]).map((status) => (
                <span key={status} className={status === selected.status ? "active" : ""}>{status}</span>
              ))}
            </div>
          </aside>
        ) : null}
        {formOpen && user ? <IncidentReportForm reporter={user} onCancel={() => setFormOpen(false)} onSubmit={add} /> : null}
      </section>
    </main>
  );
}

const attestationOptions: Array<{ kind: AttestationKind; title: string; description: string }> = [
  { kind: "still-happening", title: "Still happening", description: "The issue is still present right now." },
  { kind: "saw-it-too", title: "I saw this too", description: "You personally observed the reported issue." },
  { kind: "looks-resolved", title: "Looks resolved", description: "The issue appears to have been fixed or cleared." },
];

function AttestationDialog({
  incident,
  onClose,
  onSubmit,
}: {
  incident: Incident;
  onClose: () => void;
  onSubmit: (kind: AttestationKind) => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="account-dialog attestation-dialog" role="dialog" aria-modal="true" aria-labelledby="attestation-heading">
        <div className="account-dialog-heading">
          <div>
            <span className="eyebrow">LASU Epe attestation</span>
            <h2 id="attestation-heading">What can you confirm?</h2>
          </div>
          <button ref={closeButtonRef} className="icon-button" type="button" onClick={onClose} aria-label="Close attestation dialog">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="attestation-incident">
          <span className={`severity-mark ${incident.severity.toLowerCase()}`} aria-hidden="true" />
          <span><strong>{incident.title}</strong><small>{incident.landmark}</small></span>
        </div>
        <p className="account-intro">Choose only what you personally know. Nexus records one response per campus account.</p>
        <div className="attestation-options">
          {attestationOptions.map((option) => (
            <button type="button" key={option.kind} onClick={() => onSubmit(option.kind)}>
              <span><strong>{option.title}</strong><small>{option.description}</small></span>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
        <p className="account-note"><ShieldCheck size={14} aria-hidden="true" /> Only the matching verified campus membership can attest. The backend will enforce this rule.</p>
      </section>
    </div>
  );
}

function AdminView({
  incidents,
  onStatusChange,
}: {
  incidents: Incident[];
  onStatusChange: (id: string, status: IncidentStatus) => void;
}) {
  const [selectedId, setSelectedId] = useState(incidents[0]?.id);
  const openIncidents = incidents.filter((incident) => incident.status !== "Resolved");
  const highPriority = incidents.filter((incident) => incident.severity === "High" && incident.status !== "Resolved");
  const resolved = incidents.filter((incident) => incident.status === "Resolved");
  const selected = incidents.find((incident) => incident.id === selectedId);

  return (
    <main className="admin-page">
      <section className="admin-header">
        <div>
          <span className="eyebrow">Campus operations · prototype</span>
          <h1>Incident intelligence</h1>
          <p>Prioritise what needs attention and track progress across LASU Epe.</p>
        </div>
        <div className="admin-identity"><ShieldCheck size={18} aria-hidden="true" /><span><strong>Official view</strong><small>Works & Physical Planning</small></span></div>
      </section>

      <section className="metric-grid" aria-label="Incident summary">
        <article><span className="metric-icon"><Radio size={19} aria-hidden="true" /></span><div><strong>{openIncidents.length}</strong><span>Open reports</span></div><small>Needs review or action</small></article>
        <article><span className="metric-icon danger"><Flame size={19} aria-hidden="true" /></span><div><strong>{highPriority.length}</strong><span>High priority</span></div><small>Immediate attention</small></article>
        <article><span className="metric-icon success"><CheckCircle2 size={19} aria-hidden="true" /></span><div><strong>{resolved.length}</strong><span>Resolved</span></div><small>Current demo period</small></article>
        <article><span className="metric-icon"><Layers3 size={19} aria-hidden="true" /></span><div><strong>{incidents.reduce((sum, incident) => sum + incident.confirmations, 0)}</strong><span>Confirmations</span></div><small>Community confidence</small></article>
      </section>

      <section className="admin-workspace">
        <div className="heatmap-card">
          <div className="admin-card-heading"><div><span className="eyebrow">Geographic pattern</span><h2>Incident heatmap</h2></div><span className="heatmap-live"><i /> Live prototype</span></div>
          <div className="admin-map"><IncidentMap incidents={incidents} selectedId={selectedId} heatmap onSelect={(incident) => setSelectedId(incident.id)} /></div>
        </div>
        <aside className="priority-card">
          <div className="admin-card-heading"><div><span className="eyebrow">Selected report</span><h2>Action panel</h2></div></div>
          {selected ? (
            <div className="admin-selected">
              <div className="incident-detail-topline"><span className={`severity-label ${selected.severity.toLowerCase()}`}>{selected.severity} priority</span><StatusPill status={selected.status} /></div>
              <h3>{selected.title}</h3>
              <p>{selected.description}</p>
              <div className="admin-selected-meta"><span><MapPin size={15} aria-hidden="true" />{selected.landmark}</span><span><Radio size={15} aria-hidden="true" />{selected.confirmations} confirmations</span></div>
              <label htmlFor="admin-status">Update status</label>
              <select id="admin-status" value={selected.status} onChange={(event) => onStatusChange(selected.id, event.target.value as IncidentStatus)}>
                <option>Reported</option><option>Verified</option><option>In progress</option><option>Resolved</option>
              </select>
              <div className="assigned-team"><Wrench size={17} aria-hidden="true" /><span><strong>Suggested team</strong>{selected.category === "Water" ? "Plumbing & Water" : selected.category === "Environment" ? "Environmental Services" : "Works & Physical Planning"}</span></div>
            </div>
          ) : <div className="empty-state"><AlertTriangle size={28} aria-hidden="true" /><strong>Select a report</strong></div>}
        </aside>
      </section>

      <section className="admin-table-card">
        <div className="admin-card-heading"><div><span className="eyebrow">Operational queue</span><h2>All campus reports</h2></div><span className="table-count">{incidents.length} reports</span></div>
        <div className="admin-table" role="table" aria-label="Campus incident queue">
          <div className="admin-table-row header" role="row"><span role="columnheader">Issue</span><span role="columnheader">Priority</span><span role="columnheader">Confidence</span><span role="columnheader">Status</span></div>
          {incidents.map((incident) => (
            <button className={`admin-table-row${incident.id === selectedId ? " selected" : ""}`} type="button" role="row" key={incident.id} onClick={() => setSelectedId(incident.id)}>
              <span role="cell"><strong>{incident.title}</strong><small>{incident.landmark}</small></span>
              <span role="cell"><span className={`severity-label ${incident.severity.toLowerCase()}`}>{incident.severity}</span></span>
              <span role="cell">{incident.confirmations} confirmations</span>
              <span role="cell"><StatusPill status={incident.status} /></span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

type ListingForm = {
  businessName: string;
  category: string;
  services: string;
  landmark: string;
  hours: string;
  announcement: string;
};

const emptyListing: ListingForm = {
  businessName: "",
  category: "Printing & document services",
  services: "",
  landmark: "",
  hours: "",
  announcement: "",
};

function ProviderView({
  onBack,
  onSave,
}: {
  onBack: () => void;
  onSave: (listing: ListingForm) => void;
}) {
  const [form, setForm] = useState<ListingForm>(emptyListing);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ListingForm, string>>>({});

  const updateField = (field: keyof ListingForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submitListing = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof ListingForm, string>> = {};
    if (!form.businessName.trim()) nextErrors.businessName = "Enter the service or business name.";
    if (!form.services.trim()) nextErrors.services = "Add at least one service.";
    if (!form.landmark.trim()) nextErrors.landmark = "Describe a nearby campus landmark.";
    if (!form.hours.trim()) nextErrors.hours = "Add current opening hours.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const firstField = Object.keys(nextErrors)[0];
      document.getElementById(firstField)?.focus();
      return;
    }
    onSave(form);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <main className="provider-page success-page">
        <section className="success-card">
          <span className="success-icon"><Check size={28} aria-hidden="true" /></span>
          <span className="eyebrow">Draft saved</span>
          <h1>{form.businessName} is ready for review</h1>
          <p>In the production version, a campus moderator would verify the provider and map location before the listing becomes public.</p>
          <div className="submission-summary">
            <div><span>Category</span><strong>{form.category}</strong></div>
            <div><span>Services</span><strong>{form.services}</strong></div>
            <div><span>Landmark</span><strong>{form.landmark}</strong></div>
          </div>
          <div className="success-actions">
            <button className="primary-button" type="button" onClick={onBack}>Return to services</button>
            <button className="secondary-button" type="button" onClick={() => { setSubmitted(false); setForm(emptyListing); }}>
              Add another listing
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="provider-page">
      <section className="provider-intro">
        <button className="back-button" type="button" onClick={onBack}>
          <ArrowLeft size={17} aria-hidden="true" /> Back to services
        </button>
        <span className="eyebrow">Provider portal</span>
        <h1>Make your service easier to find.</h1>
        <p>Add accurate location details, opening hours and current services for students around LASU Epe.</p>
        <div className="provider-points">
          <div><MapPin size={19} aria-hidden="true" /><span><strong>Pin your location</strong>Use a landmark students already know.</span></div>
          <div><Store size={19} aria-hidden="true" /><span><strong>List current services</strong>Keep your offering clear and searchable.</span></div>
          <div><ShieldCheck size={19} aria-hidden="true" /><span><strong>Get verified</strong>Listings are reviewed before publication.</span></div>
        </div>
      </section>

      <section className="provider-form-card" aria-labelledby="provider-form-heading">
        <div className="form-heading">
          <span>Step 1 of 2 · Basic information</span>
          <h2 id="provider-form-heading">Create a service listing</h2>
          <p>This prototype saves the draft locally for demonstration.</p>
        </div>
        <form onSubmit={submitListing} noValidate>
          <div className="field-group">
            <label htmlFor="businessName">Business or service name <span>*</span></label>
            <input
              id="businessName"
              type="text"
              autoComplete="organization"
              value={form.businessName}
              onChange={(event) => updateField("businessName", event.target.value)}
              placeholder="e.g. Press Point"
              aria-invalid={Boolean(errors.businessName)}
              aria-describedby={errors.businessName ? "businessName-error" : undefined}
            />
            {errors.businessName ? <p className="field-error" id="businessName-error">{errors.businessName}</p> : null}
          </div>

          <div className="field-group">
            <label htmlFor="category">Service category <span>*</span></label>
            <select id="category" value={form.category} onChange={(event) => updateField("category", event.target.value)}>
              <option>Printing & document services</option>
              <option>Food & drinks</option>
              <option>Stationery & supplies</option>
              <option>Transport</option>
              <option>Other campus service</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="services">Services offered <span>*</span></label>
            <input
              id="services"
              type="text"
              value={form.services}
              onChange={(event) => updateField("services", event.target.value)}
              placeholder="Printing, photocopying, binding"
              aria-invalid={Boolean(errors.services)}
              aria-describedby={errors.services ? "services-error services-help" : "services-help"}
            />
            <p className="field-help" id="services-help">Separate services with commas.</p>
            {errors.services ? <p className="field-error" id="services-error">{errors.services}</p> : null}
          </div>

          <div className="form-row">
            <div className="field-group">
              <label htmlFor="landmark">Nearest landmark <span>*</span></label>
              <input
                id="landmark"
                type="text"
                value={form.landmark}
                onChange={(event) => updateField("landmark", event.target.value)}
                placeholder="Beside Engineering Hall"
                aria-invalid={Boolean(errors.landmark)}
                aria-describedby={errors.landmark ? "landmark-error" : undefined}
              />
              {errors.landmark ? <p className="field-error" id="landmark-error">{errors.landmark}</p> : null}
            </div>
            <div className="field-group">
              <label htmlFor="hours">Opening hours <span>*</span></label>
              <input
                id="hours"
                type="text"
                value={form.hours}
                onChange={(event) => updateField("hours", event.target.value)}
                placeholder="Mon–Sat, 8 AM–6 PM"
                aria-invalid={Boolean(errors.hours)}
                aria-describedby={errors.hours ? "hours-error" : undefined}
              />
              {errors.hours ? <p className="field-error" id="hours-error">{errors.hours}</p> : null}
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="announcement">Current service update <span className="optional">Optional</span></label>
            <textarea
              id="announcement"
              rows={3}
              value={form.announcement}
              onChange={(event) => updateField("announcement", event.target.value)}
              placeholder="Tell students about a new service or temporary change."
            />
          </div>

          <div className="verification-note">
            <ShieldCheck size={18} aria-hidden="true" />
            <p><strong>Verification protects students.</strong> Official locations and service providers should be reviewed before appearing publicly.</p>
          </div>

          <button className="primary-button submit-button" type="submit">
            Save draft listing <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
      </section>
    </main>
  );
}

function AccountDialog({
  user,
  reason,
  savedCount,
  reportCount,
  onClose,
  onSignIn,
  onSignOut,
}: {
  user: UserProfile | null;
  reason: string;
  savedCount: number;
  reportCount: number;
  onClose: () => void;
  onSignIn: (profile: UserProfile) => void;
  onSignOut: () => void;
}) {
  const [form, setForm] = useState<AccountForm>(emptyAccountForm);
  const [errors, setErrors] = useState<Partial<Record<keyof AccountForm, string>>>({});
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const selectedInstitution = getInstitution(form.institutionId) ?? institutions[0];

  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const update = (field: keyof AccountForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof AccountForm, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!form.matricNumber.trim()) nextErrors.matricNumber = "Enter your matric number.";
    if (!form.institutionId) nextErrors.institutionId = "Choose your institution.";
    if (!form.campusId) nextErrors.campusId = "Choose your campus.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      document.getElementById(`account-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }
    onSignIn({
      id: crypto.randomUUID(),
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      matricNumber: form.matricNumber.trim().toUpperCase(),
      institutionId: form.institutionId,
      campusId: form.campusId,
      department: form.department.trim(),
      level: form.level,
      membershipStatus: "demo-verified",
    });
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-heading">
        <div className="account-dialog-heading">
          <div>
            <span className="eyebrow">Nexus account</span>
            <h2 id="account-heading">{user ? `Welcome, ${user.name.split(" ")[0]}` : "Keep your campus activity together"}</h2>
          </div>
          <button ref={closeButtonRef} className="icon-button" type="button" onClick={onClose} aria-label="Close account dialog">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {user ? (
          <>
            <div className="account-profile">
              <span className="account-avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
              <span>
                <strong>{user.name}</strong>
                <small>{user.matricNumber} · {user.email}</small>
                <small>{getInstitution(user.institutionId)?.shortName ?? "Campus"} · {getCampus(user.campusId)?.name ?? user.campusId}</small>
              </span>
            </div>
            <div className={`membership-badge${isNexusCampusMember(user.campusId) ? " eligible" : ""}`}>
              <ShieldCheck size={16} aria-hidden="true" />
              <span><strong>Demo campus membership</strong>{isNexusCampusMember(user.campusId) ? "Eligible for LASU Epe community actions" : "Browse-only access on LASU Epe"}</span>
            </div>
            <div className="account-stats" aria-label="Account activity">
              <div><strong>{savedCount}</strong><span>Saved places</span></div>
              <div><strong>{reportCount}</strong><span>Reports submitted</span></div>
            </div>
            <p className="account-note">This account is stored only in this browser for the frontend prototype. Secure authentication will replace it when the backend is connected.</p>
            <button className="secondary-button sign-out-button" type="button" onClick={onSignOut}>
              <LogOut size={17} aria-hidden="true" /> Sign out
            </button>
          </>
        ) : (
          <>
            {reason ? <div className="account-reason"><LockKeyhole size={17} aria-hidden="true" /><span>{reason}</span></div> : null}
            <p className="account-intro">Create a local demo profile. Browsing stays open, while reports and attestations are restricted to the account’s selected campus.</p>
            <form className="account-form" onSubmit={submit} noValidate>
              <div className="field-group">
                <label htmlFor="account-name">Full name <span>*</span></label>
                <input id="account-name" type="text" autoComplete="name" spellCheck={false} value={form.name} onChange={(event) => update("name", event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "account-name-error" : undefined} />
                {errors.name ? <p className="field-error" id="account-name-error">{errors.name}</p> : null}
              </div>
              <div className="field-group">
                <label htmlFor="account-email">Email <span>*</span></label>
                <input id="account-email" type="email" autoComplete="email" spellCheck={false} value={form.email} onChange={(event) => update("email", event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "account-email-error" : undefined} />
                {errors.email ? <p className="field-error" id="account-email-error">{errors.email}</p> : null}
              </div>
              <fieldset className="account-campus-fields">
                <legend>Campus membership</legend>
                <div className="field-group">
                  <label htmlFor="account-institutionId">Institution <span>*</span></label>
                  <select
                    id="account-institutionId"
                    value={form.institutionId}
                    onChange={(event) => {
                      const institution = getInstitution(event.target.value) ?? institutions[0];
                      setForm((current) => ({ ...current, institutionId: institution.id, campusId: institution.campuses[0]?.id ?? "" }));
                    }}
                  >
                    {institutions.map((institution) => <option value={institution.id} key={institution.id}>{institution.name}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="account-campusId">Campus <span>*</span></label>
                  <select id="account-campusId" value={form.campusId} onChange={(event) => update("campusId", event.target.value)}>
                    {selectedInstitution.campuses.map((campus) => <option value={campus.id} key={campus.id}>{campus.name}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="account-matricNumber">Matric number <span>*</span></label>
                  <input id="account-matricNumber" type="text" inputMode="numeric" autoComplete="off" spellCheck={false} value={form.matricNumber} onChange={(event) => update("matricNumber", event.target.value)} aria-invalid={Boolean(errors.matricNumber)} aria-describedby={errors.matricNumber ? "account-matricNumber-error" : undefined} />
                  {errors.matricNumber ? <p className="field-error" id="account-matricNumber-error">{errors.matricNumber}</p> : null}
                </div>
              </fieldset>
              <div className="form-row">
                <div className="field-group">
                  <label htmlFor="account-department">Department <span className="optional">Optional</span></label>
                  <input id="account-department" type="text" autoComplete="organization-title" value={form.department} onChange={(event) => update("department", event.target.value)} placeholder="e.g. Mechanical Engineering" />
                </div>
                <div className="field-group">
                  <label htmlFor="account-level">Level <span className="optional">Optional</span></label>
                  <select id="account-level" value={form.level} onChange={(event) => update("level", event.target.value)}>
                    <option value="">Select level</option>
                    <option value="100">100 level</option>
                    <option value="200">200 level</option>
                    <option value="300">300 level</option>
                    <option value="400">400 level</option>
                    <option value="500">500 level</option>
                    <option value="postgraduate">Postgraduate</option>
                  </select>
                </div>
              </div>
              <p className="account-note"><LockKeyhole size={14} aria-hidden="true" /> No password is collected or stored in this prototype.</p>
              <button className="primary-button account-submit" type="submit">Create demo account <ArrowRight size={17} aria-hidden="true" /></button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export function NexusApp() {
  const [view, setView] = useState<View>("explore");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(places[0]?.id ?? null);
  const [user, setUser] = useLocalStorageState<UserProfile | null>("nexus-user:v2", null);
  const [savedPlaceIds, setSavedPlaceIds] = useLocalStorageState<string[]>("nexus-saved-places:v2", []);
  const [incidents, setIncidents] = useLocalStorageState<Incident[]>("nexus-incidents:v2", initialIncidents);
  const [submittedReports, setSubmittedReports] = useLocalStorageState<string[]>("nexus-submitted-reports:v2", []);
  const [attestations, setAttestations] = useLocalStorageState<IncidentAttestation[]>("nexus-attestations:v2", []);
  const [, setProviderListings] = useLocalStorageState<ListingForm[]>("nexus-provider-listings:v2", []);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountReason, setAccountReason] = useState("");
  const [attestationIncident, setAttestationIncident] = useState<Incident | null>(null);
  const [toast, setToast] = useState("");
  const pendingAction = useRef<PendingAction | null>(null);
  const campusIncidents = incidents.filter((incident) => incident.campusId === NEXUS_CAMPUS_ID);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const requireAccount = (reason: string, action: (profile: UserProfile) => void) => {
    if (user) {
      action(user);
      return;
    }
    pendingAction.current = { action, campusOnly: false };
    setAccountReason(reason);
    setAccountOpen(true);
  };

  const requireCampusMembership = (reason: string, action: (profile: UserProfile) => void) => {
    if (!user) {
      pendingAction.current = { action, campusOnly: true };
      setAccountReason(reason);
      setAccountOpen(true);
      return;
    }
    if (!isNexusCampusMember(user.campusId)) {
      setToast("Only LASU Epe campus members can take this action.");
      return;
    }
    action(user);
  };

  const signIn = (profile: UserProfile) => {
    setUser(profile);
    setAccountOpen(false);
    setToast(`Welcome to Nexus, ${profile.name.split(" ")[0]}.`);
    const pending = pendingAction.current;
    pendingAction.current = null;
    if (pending?.campusOnly && !isNexusCampusMember(profile.campusId)) {
      setToast("Account created. LASU Epe community actions remain restricted to LASU Epe members.");
      return;
    }
    window.setTimeout(() => pending?.action(profile), 0);
  };

  const toggleSavedPlace = (place: Place) => {
    requireAccount("Sign in to keep saved campus places on this device.", () => {
      setSavedPlaceIds((current) => current.includes(place.id)
        ? current.filter((id) => id !== place.id)
        : [...current, place.id]);
      setToast(savedPlaceIds.includes(place.id) ? `${place.name} removed from saved places.` : `${place.name} saved.`);
    });
  };

  const addIncident = (incident: Incident) => {
    setIncidents((current) => [incident, ...current]);
    setSubmittedReports((current) => [incident.id, ...current]);
    setToast("Report submitted and saved on this device.");
  };

  const requestAttestation = (incident: Incident) => {
    requireCampusMembership("Sign in with a LASU Epe campus account to attest to this report.", (profile) => {
      if (incident.reportedBy === profile.id) {
        setToast("You cannot attest to your own report.");
        return;
      }
      if (attestations.some((item) => item.incidentId === incident.id && item.userId === profile.id)) {
        setToast("You have already attested to this report.");
        return;
      }
      setAttestationIncident(incident);
    });
  };

  const submitAttestation = (kind: AttestationKind) => {
    if (!user || !attestationIncident || !isNexusCampusMember(user.campusId)) return;
    const alreadyAttested = attestations.some((item) => item.incidentId === attestationIncident.id && item.userId === user.id);
    if (alreadyAttested) {
      setAttestationIncident(null);
      setToast("You have already attested to this report.");
      return;
    }
    setAttestations((current) => [...current, {
      id: crypto.randomUUID(),
      incidentId: attestationIncident.id,
      userId: user.id,
      campusId: user.campusId,
      kind,
      createdAt: new Date().toISOString(),
    }]);
    setIncidents((current) => current.map((incident) => (
      incident.id === attestationIncident.id
        ? { ...incident, confirmations: incident.confirmations + 1 }
        : incident
    )));
    setAttestationIncident(null);
    setToast("Your campus attestation was recorded.");
  };

  const updateIncidentStatus = (id: string, status: IncidentStatus) => {
    setIncidents((current) => current.map((incident) => (
      incident.id === id ? { ...incident, status } : incident
    )));
    setToast(`Report status changed to ${status}.`);
  };

  const openProvider = () => requireCampusMembership("Sign in with a LASU Epe campus account before creating a campus service listing.", () => setView("provider"));

  const viewPlace = (place: Place) => {
    setSelectedPlaceId(place.id);
    setView("explore");
  };

  return (
    <div className="app-shell">
      <Header
        view={view}
        user={user}
        onViewChange={(nextView) => nextView === "provider" ? openProvider() : setView(nextView)}
        onAccount={() => { setAccountReason(""); setAccountOpen(true); }}
      />
      {view === "explore" ? (
        <ExploreView
          selectedPlaceId={selectedPlaceId}
          savedPlaceIds={savedPlaceIds}
          onSelectPlace={(place) => setSelectedPlaceId(place?.id ?? null)}
          onToggleSave={toggleSavedPlace}
        />
      ) : null}
      {view === "services" ? <ServicesView onListService={openProvider} onViewPlace={viewPlace} /> : null}
      {view === "reports" ? (
        <ReportsView
          incidents={campusIncidents}
          user={user}
          attestations={attestations}
          onAddIncident={addIncident}
          onRequestAttestation={requestAttestation}
          onRequestReport={(openForm) => requireCampusMembership("Sign in with a LASU Epe campus account before submitting a campus report.", () => openForm())}
        />
      ) : null}
      {view === "admin" ? (
        <AdminView incidents={campusIncidents} onStatusChange={updateIncidentStatus} />
      ) : null}
      {view === "provider" ? (
        <ProviderView
          onBack={() => setView("services")}
          onSave={(listing) => {
            setProviderListings((current) => [listing, ...current]);
            setToast("Service listing draft saved on this device.");
          }}
        />
      ) : null}
      {accountOpen ? (
        <AccountDialog
          user={user}
          reason={accountReason}
          savedCount={savedPlaceIds.length}
          reportCount={submittedReports.length}
          onClose={() => { setAccountOpen(false); pendingAction.current = null; }}
          onSignIn={signIn}
          onSignOut={() => {
            setUser(null);
            setSavedPlaceIds([]);
            setSubmittedReports([]);
            setAccountOpen(false);
            setToast("Signed out of the local Nexus account.");
          }}
        />
      ) : null}
      {attestationIncident ? (
        <AttestationDialog
          incident={attestationIncident}
          onClose={() => setAttestationIncident(null)}
          onSubmit={submitAttestation}
        />
      ) : null}
      {toast ? <div className="toast" role="status" aria-live="polite"><CheckCircle2 size={17} aria-hidden="true" />{toast}</div> : null}
    </div>
  );
}
