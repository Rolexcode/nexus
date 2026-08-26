"use client";

import dynamic from "next/dynamic";
import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
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
  MapPin,
  Menu,
  Navigation,
  Plus,
  Radio,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Utensils,
  Wrench,
  X,
} from "lucide-react";
import { lasuEpePlaces as places } from "@/data/lasu-epe";
import {
  categories,
  categoryClass,
  incidentCategories,
  initialIncidents,
  type Incident,
  type IncidentStatus,
  type Place,
  type PlaceCategory,
} from "@/lib/data";

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

function Header({ view, onViewChange }: { view: View; onViewChange: (view: View) => void }) {
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
  routeActive,
  onRoute,
  onClose,
}: {
  place: Place;
  routeActive: boolean;
  onRoute: () => void;
  onClose: () => void;
}) {
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

      <button className="primary-button route-button" type="button" onClick={onRoute}>
        <Navigation size={18} aria-hidden="true" />
        {routeActive ? "Hide route preview" : `Preview ${place.walkMinutes} min route`}
      </button>
    </aside>
  );
}

function ExploreView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(places[0]);
  const [routeActive, setRouteActive] = useState(false);

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

  const selectPlace = (place: Place) => {
    setSelectedPlace(place);
    setRouteActive(false);
  };

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
          selectedPlace={selectedPlace}
          routeActive={routeActive}
          onSelect={selectPlace}
        />
        <div className="map-context">
          <Layers3 size={15} aria-hidden="true" />
          LASU Epe · satellite campus map
        </div>
        <div className="map-legend" aria-label="Map data note">
          <ShieldCheck size={15} aria-hidden="true" />
          Campus names from Prosper’s map · positions are prototype-aligned
        </div>
        {selectedPlace ? (
          <PlaceDetails
            place={selectedPlace}
            routeActive={routeActive}
            onRoute={() => setRouteActive((active) => !active)}
            onClose={() => { setSelectedPlace(null); setRouteActive(false); }}
          />
        ) : null}
      </section>
    </main>
  );
}

function ServicesView({ onListService }: { onListService: () => void }) {
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
                <button type="button" aria-label={`View ${place.name} on the campus map`}>
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
  confirmed,
  onSelect,
  onConfirm,
}: {
  incident: Incident;
  selected: boolean;
  confirmed: boolean;
  onSelect: () => void;
  onConfirm: () => void;
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
        <span><Radio size={14} aria-hidden="true" /> {incident.confirmations} student confirmations</span>
        {incident.status !== "Resolved" ? (
          <button type="button" onClick={onConfirm} disabled={confirmed}>
            {confirmed ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
            {confirmed ? "Confirmed" : "I can confirm"}
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
  anonymous: boolean;
  fileName: string;
};

const emptyIncidentDraft: IncidentDraft = {
  category: "Infrastructure",
  title: "",
  description: "",
  landmark: "",
  anonymous: true,
  fileName: "",
};

function IncidentReportForm({
  onCancel,
  onSubmit,
}: {
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
      coordinates: [6.59402, 3.99562],
      landmark: draft.landmark.trim(),
      reportedAt: "Just now",
      confirmations: 1,
      severity: draft.category === "Safety" || draft.category === "Electrical hazard" ? "High" : "Medium",
      status: "Reported",
      anonymous: draft.anonymous,
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
  onAddIncident,
  onConfirmIncident,
}: {
  incidents: Incident[];
  onAddIncident: (incident: Incident) => void;
  onConfirmIncident: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(incidents[0]?.id);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const selected = incidents.find((incident) => incident.id === selectedId);

  const confirm = (id: string) => {
    if (confirmedIds.has(id)) return;
    onConfirmIncident(id);
    setConfirmedIds((current) => new Set(current).add(id));
  };

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
          <button className="primary-button" type="button" onClick={() => setFormOpen(true)}>
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
              confirmed={confirmedIds.has(incident.id)}
              onSelect={() => setSelectedId(incident.id)}
              onConfirm={() => confirm(incident.id)}
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
              <span><Radio size={16} aria-hidden="true" /> {selected.confirmations} confirmations</span>
              {selected.evidenceLabel ? <span><Camera size={16} aria-hidden="true" /> {selected.evidenceLabel}</span> : null}
            </div>
            <div className="status-path" aria-label={`Incident status: ${selected.status}`}>
              {(["Reported", "Verified", "In progress", "Resolved"] as IncidentStatus[]).map((status) => (
                <span key={status} className={status === selected.status ? "active" : ""}>{status}</span>
              ))}
            </div>
          </aside>
        ) : null}
        {formOpen ? <IncidentReportForm onCancel={() => setFormOpen(false)} onSubmit={add} /> : null}
      </section>
    </main>
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

function ProviderView({ onBack }: { onBack: () => void }) {
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

export function NexusApp() {
  const [view, setView] = useState<View>("explore");
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);

  const addIncident = (incident: Incident) => {
    setIncidents((current) => [incident, ...current]);
  };

  const confirmIncident = (id: string) => {
    setIncidents((current) => current.map((incident) => (
      incident.id === id ? { ...incident, confirmations: incident.confirmations + 1 } : incident
    )));
  };

  const updateIncidentStatus = (id: string, status: IncidentStatus) => {
    setIncidents((current) => current.map((incident) => (
      incident.id === id ? { ...incident, status } : incident
    )));
  };

  return (
    <div className="app-shell">
      <Header view={view} onViewChange={setView} />
      {view === "explore" ? <ExploreView /> : null}
      {view === "services" ? <ServicesView onListService={() => setView("provider")} /> : null}
      {view === "reports" ? (
        <ReportsView
          incidents={incidents}
          onAddIncident={addIncident}
          onConfirmIncident={confirmIncident}
        />
      ) : null}
      {view === "admin" ? (
        <AdminView incidents={incidents} onStatusChange={updateIncidentStatus} />
      ) : null}
      {view === "provider" ? <ProviderView onBack={() => setView("services")} /> : null}
    </div>
  );
}
