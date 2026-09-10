import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  MapPin,
  Navigation,
  Search,
  Store,
} from "lucide-react";
import { lasuEpePlaces as places } from "@/data/lasu-epe";
import { NexusSiteHeader } from "@/components/nexus-site-header";
import styles from "./task-first-home.module.css";

const actions = [
  { title: "Find a place", copy: "Open the campus map and go straight to where you need to be.", icon: Navigation, href: "/map" },
  { title: "Report a problem", copy: "Report an issue, add evidence and follow what happens next.", icon: AlertTriangle, href: "/reports" },
  { title: "Find a service", copy: "Discover trusted food, printing, repairs and student services.", icon: Store, href: "/services" },
  { title: "Campus updates", copy: "See approved events, notices and useful service updates.", icon: CalendarDays, href: "/updates" },
] as const;

const featuredPlaces = places.filter((place) => ["main-gate", "new-cbt-centre", "engineering-hall"].includes(place.id));

export function TaskFirstHome() {
  return (
    <main className={styles.page}>
      <NexusSiteHeader />
      <section className={styles.hero}>
        <span className={styles.kicker}><MapPin size={15} /> LASU Epe Campus</span>
        <h1>What do you need on campus?</h1>
        <p>Choose one clear task and Nexus takes you straight to the right place.</p>
        <div className={styles.actions}>
          {actions.map(({ title, copy, icon: Icon, href }) => (
            <a href={href} className={styles.actionCard} key={title}>
              <span className={styles.actionIcon}><Icon size={21} /></span>
              <span className={styles.actionCopy}><strong>{title}</strong><small>{copy}</small></span>
              <ArrowRight size={18} className={styles.arrow} />
            </a>
          ))}
        </div>
      </section>

      <section className={styles.directory}>
        <div className={styles.sectionHeading}>
          <div><span>Campus directory</span><h2>Or browse familiar places</h2></div>
          <a href="/map" className={styles.mapButton}><Navigation size={16} /> Open full campus map</a>
        </div>
        <a href="/map" className={styles.searchShortcut}>
          <Search size={20} /><span>Search buildings, food, printing or services</span><ArrowRight size={17} />
        </a>
        <div className={styles.placeList}>
          {featuredPlaces.map((place) => (
            <a href={`/map?place=${encodeURIComponent(place.id)}`} className={styles.place} key={place.id}>
              <span className={styles.placePin}><MapPin size={18} /></span>
              <span><strong>{place.name}</strong><small>{place.category} · {place.walkMinutes} min from gate</small></span>
              <ArrowRight size={17} />
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
