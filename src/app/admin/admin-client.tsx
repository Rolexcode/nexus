"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  FileImage,
  LockKeyhole,
  MapPin,
  Radio,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  hasFirebaseAdminRole,
  readCaseEvidence,
  readCaseReporter,
  subscribeToFirebaseAuth,
  type CaseEvidence,
  type CaseReporter,
} from "@/lib/firebase-rest";
import {
  approveBoardSubmission,
  approveServiceSubmission,
  listBoardSubmissions,
  listServiceSubmissions,
  rejectBoardSubmission,
  rejectServiceSubmission,
  type CampusBoardPost,
  type CommunityServiceListing,
} from "@/lib/community-data";
import { initialIncidents, type Incident, type IncidentStatus } from "@/lib/data";
import { useLocalStorageState } from "@/lib/use-local-storage-state";
import styles from "./admin.module.css";

const INCIDENTS_KEY = "nexus-incidents:v2";
const statusOrder: IncidentStatus[] = ["Reported", "Verified", "In progress", "Resolved"];

function formatTimestamp(value?: string) {
  if (!value) return "Timestamp unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function nextStatus(status: IncidentStatus): IncidentStatus | null {
  const index = statusOrder.indexOf(status);
  return index >= 0 && index < statusOrder.length - 1 ? statusOrder[index + 1] : null;
}

function actionLabel(status: IncidentStatus) {
  if (status === "Reported") return "Verify report";
  if (status === "Verified") return "Mark in progress";
  if (status === "In progress") return "Mark resolved";
  return "Resolved";
}

export function AdminClient() {
  const [incidents, setIncidents] = useLocalStorageState<Incident[]>(INCIDENTS_KEY, initialIncidents);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [reporter, setReporter] = useState<CaseReporter | null>(null);
  const [evidence, setEvidence] = useState<CaseEvidence | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [caseNotice, setCaseNotice] = useState("");
  const [serviceSubmissions, setServiceSubmissions] = useState<CommunityServiceListing[]>([]);
  const [boardSubmissions, setBoardSubmissions] = useState<CampusBoardPost[]>([]);
  const [moderationBusy, setModerationBusy] = useState("");

  const check = async () => {
    setChecking(true);
    try {
      setIsAdmin(await hasFirebaseAdminRole());
    } catch {
      setIsAdmin(false);
    } finally {
      setChecking(false);
    }
  };

  const loadModeration = async () => {
    try {
      const [services, board] = await Promise.all([listServiceSubmissions(), listBoardSubmissions()]);
      setServiceSubmissions(services);
      setBoardSubmissions(board);
    } catch {
      setServiceSubmissions([]);
      setBoardSubmissions([]);
    }
  };

  useEffect(() => {
    void check();
    return subscribeToFirebaseAuth(() => { void check(); });
  }, []);

  useEffect(() => {
    if (isAdmin) void loadModeration();
  }, [isAdmin]);

  useEffect(() => {
    if (!selected) {
      setReporter(null);
      setEvidence(null);
      setCaseNotice("");
      return;
    }
    let active = true;
    setCaseLoading(true);
    setCaseNotice("");
    setReporter(null);
    setEvidence(null);
    void Promise.all([readCaseReporter(selected.id), readCaseEvidence(selected.id)])
      .then(([nextReporter, nextEvidence]) => {
        if (!active) return;
        setReporter(nextReporter);
        setEvidence(nextEvidence);
        if (!nextReporter && !nextEvidence) setCaseNotice("This report has no saved private reporter snapshot or uploaded evidence. It may be an older seeded case.");
      })
      .catch(() => {
        if (active) setCaseNotice("Private case details could not be loaded for this report.");
      })
      .finally(() => { if (active) setCaseLoading(false); });
    return () => { active = false; };
  }, [selected?.id]);

  const counts = useMemo(() => ({
    open: incidents.filter((item) => item.status !== "Resolved").length,
    high: incidents.filter((item) => item.severity === "High" && item.status !== "Resolved").length,
    resolved: incidents.filter((item) => item.status === "Resolved").length,
    confirmations: incidents.reduce((sum, item) => sum + item.confirmations, 0),
  }), [incidents]);

  const advanceSelected = () => {
    if (!selected) return;
    const next = nextStatus(selected.status);
    if (!next) return;
    const now = new Date().toISOString();
    let updated: Incident | null = null;
    setIncidents((current) => current.map((item) => {
      if (item.id !== selected.id) return item;
      updated = {
        ...item,
        status: next,
        statusHistory: [...(item.statusHistory ?? []), { status: next, at: now, by: "admin" }],
      };
      return updated;
    }));
    if (updated) setSelected(updated);
  };

  const moderateService = async (id: string, action: "approve" | "reject") => {
    setModerationBusy(`service-${id}`);
    try {
      if (action === "approve") await approveServiceSubmission(id);
      else await rejectServiceSubmission(id);
      await loadModeration();
    } finally {
      setModerationBusy("");
    }
  };

  const moderateBoard = async (id: string, action: "approve" | "reject") => {
    setModerationBusy(`board-${id}`);
    try {
      if (action === "approve") await approveBoardSubmission(id);
      else await rejectBoardSubmission(id);
      await loadModeration();
    } finally {
      setModerationBusy("");
    }
  };

  if (checking) return <section className={styles.state}><ShieldCheck size={24} /><strong>Checking admin access…</strong></section>;

  if (!isAdmin) {
    return (
      <section className={styles.state}>
        <LockKeyhole size={28} />
        <h1>Admin access required</h1>
        <p>Sign in with a Nexus account that has been assigned the admin role.</p>
        <button type="button" className={`account-button ${styles.signIn}`}><UserRound size={17} /> Open my account</button>
      </section>
    );
  }

  return (
    <section className={styles.workspace}>
      <div className={styles.intro}>
        <span><ShieldCheck size={15} /> Administrator</span>
        <h1>Review campus reports</h1>
        <p>Open a report to inspect the full case, reporter account, attached photo and timeline. Move legitimate cases forward one stage at a time.</p>
      </div>

      <section className={styles.metrics}>
        <article><strong>{counts.open}</strong><span>Open reports</span></article>
        <article><strong>{counts.high}</strong><span>High priority</span></article>
        <article><strong>{counts.resolved}</strong><span>Resolved</span></article>
        <article><strong>{counts.confirmations}</strong><span>Attestations</span></article>
      </section>

      <section className={styles.queue}>
        <div className={styles.sectionHeading}><div><span>Case queue</span><h2>Reports awaiting action</h2></div><small>{incidents.length} total</small></div>
        <div className={styles.reportGrid}>
          {[...incidents].reverse().map((incident) => (
            <button className={styles.reportCard} type="button" key={incident.id} onClick={() => setSelected(incident)}>
              <span className={`${styles.priorityDot} ${styles[incident.severity.toLowerCase()]}`} />
              <span className={styles.reportCopy}>
                <small>{incident.category} · {incident.createdAt ? formatTimestamp(incident.createdAt) : incident.reportedAt}</small>
                <strong>{incident.title}</strong>
                <span>{incident.landmark}</span>
              </span>
              <span className={`${styles.status} ${styles[incident.status.toLowerCase().replace(" ", "")]}`}>{incident.status}</span>
              <span className={styles.openLabel}>Review →</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.moderation}>
        <div className={styles.sectionHeading}><div><span>Trust queue</span><h2>Pending community submissions</h2></div><small>{serviceSubmissions.length + boardSubmissions.length} pending</small></div>
        <div className={styles.moderationGrid}>
          <div className={styles.moderationColumn}>
            <h3>Service recommendations</h3>
            {serviceSubmissions.length ? serviceSubmissions.map((item) => (
              <article key={item.id}><strong>{item.businessName}</strong><p>{item.services}</p><small>{item.landmark} · submitted by {item.ownerName}</small><div><button disabled={moderationBusy === `service-${item.id}`} onClick={() => void moderateService(item.id, "reject")}>Reject</button><button disabled={moderationBusy === `service-${item.id}`} onClick={() => void moderateService(item.id, "approve")}>Approve</button></div></article>
            )) : <p className={styles.empty}>No pending service recommendations.</p>}
          </div>
          <div className={styles.moderationColumn}>
            <h3>Updates & events</h3>
            {boardSubmissions.length ? boardSubmissions.map((item) => (
              <article key={item.id}><strong>{item.title}</strong><p>{item.body}</p><small>{item.dateLabel} · {item.organizer}</small><div><button disabled={moderationBusy === `board-${item.id}`} onClick={() => void moderateBoard(item.id, "reject")}>Reject</button><button disabled={moderationBusy === `board-${item.id}`} onClick={() => void moderateBoard(item.id, "approve")}>Approve</button></div></article>
            )) : <p className={styles.empty}>No pending campus updates.</p>}
          </div>
        </div>
      </section>

      {selected ? (
        <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section className={styles.reviewDialog} role="dialog" aria-modal="true" aria-labelledby="admin-case-title">
            <div className={styles.dialogTop}>
              <div><span>Admin case review</span><h2 id="admin-case-title">{selected.title}</h2><p>Case ID: {selected.id}</p></div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close review"><X size={19} /></button>
            </div>

            <div className={styles.badges}><span className={`${styles.severityBadge} ${styles[selected.severity.toLowerCase()]}`}>{selected.severity} priority</span><span className={`${styles.status} ${styles[selected.status.toLowerCase().replace(" ", "")]}`}>{selected.status}</span></div>
            <p className={styles.description}>{selected.description}</p>

            <div className={styles.caseGrid}>
              <span><MapPin size={16} /><span><small>Location</small><strong>{selected.landmark}</strong></span></span>
              <span><Clock3 size={16} /><span><small>Reported</small><strong>{selected.createdAt ? formatTimestamp(selected.createdAt) : selected.reportedAt}</strong></span></span>
              <span><Radio size={16} /><span><small>Community confidence</small><strong>{selected.confirmations} attestations</strong></span></span>
              <span><AlertTriangle size={16} /><span><small>Category</small><strong>{selected.category}</strong></span></span>
            </div>

            <section className={styles.privateCase}>
              <div className={styles.privateHeading}><ShieldCheck size={17} /><div><strong>Reporter & evidence</strong><small>Visible only to authorised admins.</small></div></div>
              {caseLoading ? <p>Loading private case details…</p> : null}
              {caseNotice ? <p>{caseNotice}</p> : null}
              {reporter ? <div className={styles.reporterGrid}><span><small>Reporter</small><strong>{reporter.name}</strong></span><span><small>Matric</small><strong>{reporter.matricNumber}</strong></span><span><small>Email</small><strong>{reporter.email}</strong></span><span><small>Department / level</small><strong>{reporter.department || "—"} {reporter.level ? `· ${reporter.level}` : ""}</strong></span></div> : null}
              {evidence ? <div className={styles.photo}><span><Camera size={15} /> <strong>Attached photo</strong> · {evidence.fileName}</span><img src={evidence.dataUrl} alt={`Evidence for ${selected.title}`} /></div> : selected.evidenceLabel ? <div className={styles.noPhoto}><FileImage size={16} /> Evidence was noted on this older case, but the original image is not stored in the current evidence collection.</div> : null}
            </section>

            <section className={styles.timeline}>
              <h3>Case timeline</h3>
              {selected.statusHistory?.length ? selected.statusHistory.map((event, index) => (
                <div className={styles.timelineRow} key={`${event.status}-${event.at}-${index}`}><i /><span><strong>{event.status}</strong><small>{formatTimestamp(event.at)} · {event.by === "admin" ? "Admin" : "Reporter"}</small></span></div>
              )) : <div className={styles.timelineRow}><i /><span><strong>{selected.status}</strong><small>Exact historical timestamps were not captured for this earlier report.</small></span></div>}
            </section>

            <section className={styles.progressBox}>
              <div><CheckCircle2 size={17} /><span><strong>Progress case</strong><small>Status changes are sequential and timestamped.</small></span></div>
              {nextStatus(selected.status) ? <button type="button" onClick={advanceSelected}>{actionLabel(selected.status)}</button> : <span className={styles.done}>Case resolved</span>}
            </section>
          </section>
        </div>
      ) : null}
    </section>
  );
}
