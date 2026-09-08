import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  MapPin,
  Navigation,
  Search,
  Store,
} from "lucide-react";
import styles from "./ui-preview.module.css";

const actions = [
  {
    title: "Find a place",
    copy: "Open the campus map and go straight to where you need to be.",
    icon: Navigation,
  },
  {
    title: "Report a problem",
    copy: "Report an issue, add evidence and follow what happens next.",
    icon: AlertTriangle,
  },
  {
    title: "Find a service",
    copy: "Discover trusted food, printing, repairs and student services.",
    icon: Store,
  },
  {
    title: "Campus updates",
    copy: "See approved events, notices and useful service updates.",
    icon: CalendarDays,
  },
];

const places = [
  ["Main Gate", "Transport · 0 min from gate"],
  ["New CBT Centre", "Academic · 6 min from gate"],
  ["Engineering Hall", "Academic · 4 min from gate"],
];

export default function UiPreviewPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.mark}>N</span>
          <span><strong>Nexus</strong><small>LASU Epe</small></span>
        </div>
        <Link className={styles.back} href="/">Back to current Nexus</Link>
      </header>

      <section className={styles.hero}>
        <span className={styles.kicker}><MapPin size={15} /> LASU Epe Campus</span>
        <h1>What do you need on campus?</h1>
        <p>Start with one clear task. Nexus takes you straight to the right place instead of making you figure out the interface first.</p>

        <div className={styles.actions}>
          {actions.map(({ title, copy, icon: Icon }) => (
            <button type="button" className={styles.actionCard} key={title}>
              <span className={styles.actionIcon}><Icon size={21} /></span>
              <span className={styles.actionCopy}><strong>{title}</strong><small>{copy}</small></span>
              <ArrowRight size={18} className={styles.arrow} />
            </button>
          ))}
        </div>
      </section>

      <section className={styles.directory}>
        <div className={styles.sectionHeading}>
          <div><span>Campus directory</span><h2>Or browse nearby places</h2></div>
          <button type="button" className={styles.mapButton}><Navigation size={16} /> Open full campus map</button>
        </div>

        <label className={styles.search}>
          <Search size={20} />
          <input type="search" placeholder="Search buildings, food, printing or services" />
        </label>

        <div className={styles.placeList}>
          {places.map(([name, meta]) => (
            <button type="button" className={styles.place} key={name}>
              <span className={styles.placePin}><MapPin size={18} /></span>
              <span><strong>{name}</strong><small>{meta}</small></span>
              <ArrowRight size={17} />
            </button>
          ))}
        </div>
      </section>

      <section className={styles.mapPreview}>
        <div>
          <span>Dedicated map screen</span>
          <h2>The map should feel like a destination, not another box on the home page.</h2>
          <p>In the real flow, tapping “Find a place” or “Open full campus map” would take the user to a full-screen map with search, their location and directions.</p>
        </div>
        <div className={styles.fakeMap} aria-hidden="true">
          <span className={styles.you}>You are here</span>
          <span className={styles.destination}>Engineering Hall</span>
          <i className={styles.route} />
        </div>
      </section>
    </main>
  );
}
