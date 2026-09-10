"use client";

import { CalendarDays, CheckCircle2, Clock3, Plus, ShieldCheck, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { listApprovedBoardPosts, submitBoardPost, type CampusBoardPost } from "@/lib/community-data";
import styles from "./updates.module.css";

type UserProfile = { id: string; name: string; email: string; campusId: string };
const USER_KEY = "nexus-user:v2";

function readProfile(): UserProfile | null {
  try { const raw = window.localStorage.getItem(USER_KEY); return raw ? JSON.parse(raw) as UserProfile : null; }
  catch { return null; }
}

export function UpdatesClient() {
  const [posts, setPosts] = useState<CampusBoardPost[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [type, setType] = useState<"student-event" | "business-update">("student-event");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [organizer, setOrganizer] = useState("");

  const load = async () => {
    setLoading(true);
    try { const items = await listApprovedBoardPosts(); setPosts(items.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))); }
    catch { setPosts([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { setProfile(readProfile()); void load(); }, []);

  const events = useMemo(() => posts.filter((post) => post.type === "student-event"), [posts]);
  const serviceUpdates = useMemo(() => posts.filter((post) => post.type === "business-update"), [posts]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || submitting) return;
    setSubmitting(true); setNotice("");
    try {
      await submitBoardPost({ type, title: title.trim(), body: body.trim(), dateLabel: dateLabel.trim(), organizer: organizer.trim(), ownerName: profile.name, campusId: profile.campusId });
      setFormOpen(false); setTitle(""); setBody(""); setDateLabel(""); setOrganizer("");
      setNotice("Submitted for verification. It will appear here after an admin approves it.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not submit this update."); }
    finally { setSubmitting(false); }
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.kicker}><CalendarDays size={15} /> Campus updates</span>
        <h1>What’s happening around campus?</h1>
        <p>Approved student events, notices and useful service updates — without digging through scattered group chats.</p>
        <div className={styles.heroActions}>
          {profile ? <button type="button" className={styles.primary} onClick={() => setFormOpen(true)}><Plus size={17} /> Submit an update or event</button> : <button type="button" className={`account-button ${styles.primary}`}><UserRound size={17} /> Sign in to submit</button>}
          <span className={styles.verifiedNote}><ShieldCheck size={16} /> Posts appear publicly only after admin verification.</span>
        </div>
        {notice ? <div className={styles.notice}>{notice}</div> : null}
      </section>

      <section className={styles.content}>
        <div className={styles.sectionHeading}><div><span>Student life</span><h2>Events & announcements</h2></div><small>{events.length} approved</small></div>
        <div className={styles.grid}>{loading ? <div className={styles.empty}>Loading campus updates…</div> : events.length ? events.map((post) => <PostCard key={post.id} post={post} />) : <div className={styles.empty}><CalendarDays size={24} /><strong>No approved events yet</strong><p>Student events will appear here after verification.</p></div>}</div>
        <div className={styles.sectionHeading}><div><span>Useful right now</span><h2>Service updates</h2></div><small>{serviceUpdates.length} approved</small></div>
        <div className={styles.grid}>{loading ? <div className={styles.empty}>Loading service updates…</div> : serviceUpdates.length ? serviceUpdates.map((post) => <PostCard key={post.id} post={post} />) : <div className={styles.empty}><CheckCircle2 size={24} /><strong>No service updates yet</strong><p>Verified changes to hours, sales or availability will appear here.</p></div>}</div>
      </section>

      {formOpen && profile ? (
        <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
          <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="update-form-heading">
            <div className={styles.dialogHeader}><div><span>Campus board submission</span><h2 id="update-form-heading">Share something useful</h2><p>Your submission stays pending until an admin verifies it.</p></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Close"><X size={18} /></button></div>
            <form onSubmit={submit}>
              <label>Post type<select value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="student-event">Student event / announcement</option><option value="business-update">Service / business update</option></select></label>
              <label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Design exhibition this Friday" /></label>
              <label>Details<textarea required rows={4} value={body} onChange={(event) => setBody(event.target.value)} placeholder="What should students know?" /></label>
              <div className={styles.formRow}><label>Date / timing<input required value={dateLabel} onChange={(event) => setDateLabel(event.target.value)} placeholder="Friday, 4 PM" /></label><label>Organizer<input required value={organizer} onChange={(event) => setOrganizer(event.target.value)} placeholder="Club, group or business" /></label></div>
              <button className={styles.primary} type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Send for verification"}</button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function PostCard({ post }: { post: CampusBoardPost }) {
  return <article className={styles.card}><div className={styles.cardTop}><span className={styles.badge}><ShieldCheck size={13} /> Approved</span><span className={styles.type}>{post.type === "student-event" ? "Event" : "Service update"}</span></div><h3>{post.title}</h3><p>{post.body}</p><div className={styles.meta}><span><Clock3 size={14} /> {post.dateLabel || "Campus update"}</span><span>{post.organizer}</span></div></article>;
}
