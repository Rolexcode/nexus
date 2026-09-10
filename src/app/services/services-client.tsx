"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, MapPin, Plus, Search, ShieldCheck, Star, Store, UserRound, X } from "lucide-react";
import { lasuEpePlaces } from "@/data/lasu-epe";
import {
  listApprovedServices,
  listReviews,
  submitReview,
  submitServiceListing,
  type CommunityServiceListing,
  type ServiceReview,
} from "@/lib/community-data";
import { subscribeToFirebaseAuth } from "@/lib/firebase-rest";
import styles from "./services.module.css";

const USER_KEY = "nexus-user:v2";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  campusId: string;
};

type ServiceCard = {
  id: string;
  name: string;
  category: string;
  services: string;
  landmark: string;
  hours: string;
  announcement?: string;
};

function readProfile(): UserProfile | null {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as UserProfile : null;
  } catch {
    return null;
  }
}

const seedServices: ServiceCard[] = lasuEpePlaces
  .filter((place) => place.category === "Food & drink" || place.category === "Business & service")
  .map((place) => ({
    id: `seed-${place.id}`,
    name: place.name,
    category: place.category,
    services: place.services.join(" · "),
    landmark: place.landmark,
    hours: place.hours,
    announcement: place.announcement,
  }));

export function ServicesClient() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [approved, setApproved] = useState<CommunityServiceListing[]>([]);
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<ServiceCard | null>(null);
  const [notice, setNotice] = useState("");

  const refreshProfile = () => setProfile(readProfile());
  const load = async () => {
    setLoading(true);
    try {
      const [services, nextReviews] = await Promise.all([listApprovedServices(), listReviews()]);
      setApproved(services);
      setReviews(nextReviews);
    } catch {
      setApproved([]);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
    void load();
    return subscribeToFirebaseAuth(refreshProfile);
  }, []);

  const cards = useMemo<ServiceCard[]>(() => {
    const community = approved.map((item) => ({
      id: item.id,
      name: item.businessName,
      category: item.category,
      services: item.services,
      landmark: item.landmark,
      hours: item.hours,
      announcement: item.announcement,
    }));
    const all = [...community, ...seedServices];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return all;
    return all.filter((item) => [item.name, item.category, item.services, item.landmark].join(" ").toLowerCase().includes(normalized));
  }, [approved, query]);

  const averageFor = (id: string) => {
    const matching = reviews.filter((review) => review.listingId === id);
    if (!matching.length) return null;
    return matching.reduce((sum, review) => sum + review.rating, 0) / matching.length;
  };

  const openRecommend = () => {
    if (!profile) {
      document.querySelector<HTMLButtonElement>(".account-button")?.click();
      return;
    }
    setRecommendOpen(true);
  };

  return (
    <>
      <section className={styles.hero}>
        <span className={styles.kicker}><Store size={15} /> Campus services</span>
        <h1>Find useful places students can trust.</h1>
        <p>Browse food, printing, repairs and other campus services. Community recommendations only become public after admin verification.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={openRecommend}><Plus size={17} /> Recommend a place</button>
          <span><ShieldCheck size={16} /> Verified listings are checked before publishing.</span>
        </div>
        {notice ? <div className={styles.notice}>{notice}</div> : null}
      </section>

      <section className={styles.content}>
        <div className={styles.searchWrap}>
          <Search size={19} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search food, printing, repairs or a place" />
        </div>

        <div className={styles.heading}>
          <div><span>Verified directory</span><h2>Services around campus</h2></div>
          <small>{cards.length} listings</small>
        </div>

        <div className={styles.grid}>
          {loading ? <div className={styles.empty}>Loading services…</div> : cards.length ? cards.map((item) => {
            const rating = averageFor(item.id);
            const count = reviews.filter((review) => review.listingId === item.id).length;
            return (
              <article className={styles.card} key={item.id}>
                <div className={styles.cardTop}><span className={styles.verified}><ShieldCheck size={13} /> Verified</span><span>{item.category}</span></div>
                <h3>{item.name}</h3>
                <p>{item.services}</p>
                <div className={styles.meta}><span><MapPin size={14} /> {item.landmark}</span><span>{item.hours}</span></div>
                {item.announcement ? <div className={styles.update}><strong>Latest update</strong><span>{item.announcement}</span></div> : null}
                <div className={styles.cardFooter}>
                  <span className={styles.rating}><Star size={15} /> {rating ? `${rating.toFixed(1)} · ${count} review${count === 1 ? "" : "s"}` : "No reviews yet"}</span>
                  <button type="button" onClick={() => {
                    if (!profile) document.querySelector<HTMLButtonElement>(".account-button")?.click();
                    else setReviewTarget(item);
                  }}>Rate this place</button>
                </div>
              </article>
            );
          }) : <div className={styles.empty}><Search size={24} /><strong>No matching services</strong><p>Try a broader search term.</p></div>}
        </div>
      </section>

      {recommendOpen && profile ? <RecommendDialog profile={profile} onClose={() => setRecommendOpen(false)} onDone={(message) => { setNotice(message); setRecommendOpen(false); }} /> : null}
      {reviewTarget && profile ? <ReviewDialog target={reviewTarget} profile={profile} onClose={() => setReviewTarget(null)} onDone={async (message) => { setNotice(message); setReviewTarget(null); await load(); }} /> : null}
    </>
  );
}

function RecommendDialog({ profile, onClose, onDone }: { profile: UserProfile; onClose: () => void; onDone: (message: string) => void }) {
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("Food & drink");
  const [services, setServices] = useState("");
  const [landmark, setLandmark] = useState("");
  const [hours, setHours] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await submitServiceListing({ businessName, category, services, landmark, hours, announcement, ownerName: profile.name, ownerEmail: profile.email, campusId: profile.campusId });
      onDone("Recommendation sent for admin verification. It will appear publicly after approval.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit this recommendation.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="recommend-heading">
        <div className={styles.dialogTop}><div><span>Recommend a place</span><h2 id="recommend-heading">Add something useful to the directory</h2><p>Nothing is published until an admin checks it.</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
        <form onSubmit={submit}>
          <label>Business / service name<input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Ade Print Shop" /></label>
          <label>Category<select value={category} onChange={(e) => setCategory(e.target.value)}><option>Food & drink</option><option>Printing</option><option>Repairs</option><option>Student service</option><option>Other</option></select></label>
          <label>What do they offer?<textarea required rows={3} value={services} onChange={(e) => setServices(e.target.value)} placeholder="Printing, binding, photocopying…" /></label>
          <label>Nearest landmark<input required value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near Engineering Hall" /></label>
          <label>Opening hours<input required value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Mon–Sat · 8 AM–6 PM" /></label>
          <label>Useful update <small>Optional</small><input value={announcement} onChange={(e) => setAnnouncement(e.target.value)} placeholder="e.g. Binding available today" /></label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.formActions}><button type="button" onClick={onClose}>Cancel</button><button type="submit" disabled={busy}>{busy ? "Submitting…" : "Send for verification"}</button></div>
        </form>
      </section>
    </div>
  );
}

function ReviewDialog({ target, profile, onClose, onDone }: { target: ServiceCard; profile: UserProfile; onClose: () => void; onDone: (message: string) => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await submitReview({ listingId: target.id, authorName: profile.name, rating, comment: comment.trim() });
      onDone("Review published.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish this review.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="review-heading">
        <div className={styles.dialogTop}><div><span>Student review</span><h2 id="review-heading">Rate {target.name}</h2><p>Help other students know what to expect.</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
        <form onSubmit={submit}>
          <label>Rating<select value={rating} onChange={(e) => setRating(Number(e.target.value))}><option value={5}>5 — Excellent</option><option value={4}>4 — Good</option><option value={3}>3 — Okay</option><option value={2}>2 — Poor</option><option value={1}>1 — Very poor</option></select></label>
          <label>Short review<textarea required rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What was useful or what should improve?" /></label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.formActions}><button type="button" onClick={onClose}>Cancel</button><button type="submit" disabled={busy}><CheckCircle2 size={15} /> {busy ? "Publishing…" : "Publish review"}</button></div>
        </form>
      </section>
    </div>
  );
}
