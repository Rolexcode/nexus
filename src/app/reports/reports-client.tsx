"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  EyeOff,
  FileImage,
  MapPin,
  Plus,
  Radio,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  hasFirebaseAdminRole,
  readCaseEvidence,
  saveCaseEvidence,
  saveCaseReporter,
  subscribeToFirebaseAuth,
  type CaseEvidence,
} from "@/lib/firebase-rest";
import {
  incidentCategories,
  initialIncidents,
  type AttestationKind,
  type Incident,
  type IncidentAttestation,
  type IncidentCategory,
  type IncidentStatus,
} from "@/lib/data";
import { lasuEpePlaces as places } from "@/data/lasu-epe";
import { useLocalStorageState } from "@/lib/use-local-storage-state";
import styles from "./reports.module.css";

const USER_KEY = "nexus-user:v2";
const INCIDENTS_KEY = "nexus-incidents:v2";
const ATTESTATIONS_KEY = "nexus-attestations:v2";
const statusOrder: IncidentStatus[] = ["Reported", "Verified", "In progress", "Resolved"];

type UserProfile = {
  id: string;
  name: string;
  email: string;
  matricNumber: string;
  institutionId: string;
  campusId: string;
  department: string;
  level: string;
};

type Draft = {
  category: IncidentCategory;
  title: string;
  description: string;
  placeId: string;
  landmark: string;
  anonymous: boolean;
  file: File | null;
};

const emptyDraft: Draft = {
  category: "Infrastructure",
  title: "",
  description: "",
  placeId: "engineering-hall",
  landmark: "",
  anonymous: true,
  file: null,
};

function readProfile(): UserProfile | null {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as UserProfile : null;
  } catch {
    return null;
  }
}

function formatTimestamp(value?: string) {
  if (!value) return "Time not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function nextStatus(status: IncidentStatus): IncidentStatus | null {
  const index = statusOrder.indexOf(status);
  return index >= 0 && index < statusOrder.length - 1 ? statusOrder[index + 1] : null;
}

function statusActionLabel(status: IncidentStatus) {
  if (status === "Reported") return "Verify report";
  if (status === "Verified") return "Mark in progress";
  if (status === "In progress") return "Mark resolved";
  return "Case resolved";
}

async function compressPhoto(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read this photo."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const next = new Image();
    next.onerror = () => reject(new Error("Could not process this photo."));
    next.onload = () => resolve(next);
    next.src = dataUrl;
  });

  const maxSide = 900;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Photo processing is unavailable.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = 0.72;
  let compressed = canvas.toDataURL("image/jpeg", quality);
  while (compressed.length > 620_000 && quality > 0.42) {
    quality -= 0.08;
    compressed = canvas.toDataURL("image/jpeg", quality);
  }
  if (compressed.length > 760_000) throw new Error("That photo is too large. Try a smaller image.");
  return { dataUrl: compressed, fileName: file.name || "incident-photo.jpg", contentType: "image/jpeg" };
}

function StatusPill({ status }: { status: IncidentStatus }) {
  return <span className={`${styles.status} ${styles[status.toLowerCase().replace(" ", "")]}`}>{status}</span>;
}

export function ReportsClient() {
  const [incidents, setIncidents] = useLocalStorageState<Incident[]>(INCIDENTS_KEY, initialIncidents);
  const [attestations, setAttestations] = useLocalStorageState<IncidentAttestation[]>(ATTESTATIONS_KEY, []);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [detail, setDetail] = useState<Incident | null>(null);
  const [detailEvidence, setDetailEvidence] = useState<CaseEvidence | null>(null);
  const [detailEvidenceState, setDetailEvidenceState] = useState<"idle" | "loading" | "private">("idle");
  const [reportOpen, setReportOpen] = useState(false);
  const [attestIncident, setAttestIncident] = useState<Incident | null>(null);

  const refreshProfile = () => setProfile(readProfile());
  const refreshAdmin = async () => {
    try {
      setIsAdmin(await hasFirebaseAdminRole());
    } catch {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    refreshProfile();
    void refreshAdmin();
    window.addEventListener("storage", refreshProfile);
    return subscribeToFirebaseAuth(() => {
      refreshProfile();
      void refreshAdmin();
    });
  }, []);

  useEffect(() => {
    if (!detail) {
      setDetailEvidence(null);
      setDetailEvidenceState("idle");
      return;
    }
    let active = true;
    setDetailEvidence(null);
    setDetailEvidenceState("loading");
    void readCaseEvidence(detail.id)
      .then((evidence) => {
        if (!active) return;
        setDetailEvidence(evidence);
        setDetailEvidenceState(evidence ? "idle" : "private");
      })
      .catch(() => {
        if (active) setDetailEvidenceState("private");
      });
    return () => { active = false; };
  }, [detail]);

  const sorted = useMemo(() => [...incidents].reverse(), [incidents]);

  const openReport = () => {
    if (!profile) {
      document.querySelector<HTMLButtonElement>(".account-button")?.click();
      return;
    }
    setReportOpen(true);
  };

  const advanceDetailStatus = () => {
    if (!detail || !isAdmin) return;
    const next = nextStatus(detail.status);
    if (!next) return;
    const now = new Date().toISOString();
    const updated: Incident = {
      ...detail,
      status: next,
      statusHistory: [...(detail.statusHistory ?? []), { status: next, at: now, by: "admin" }],
    };
    setIncidents((current) => current.map((item) => item.id === detail.id ? updated : item));
    setDetail(updated);
  };

  const submitAttestation = (kind: AttestationKind) => {
    if (!profile || !attestIncident) return;
    const exists = attestations.some((item) => item.incidentId === attestIncident.id && item.userId === profile.id);
    if (exists || attestIncident.reportedBy === profile.id) {
      setAttestIncident(null);
      return;
    }
    const now = new Date().toISOString();
    setAttestations((current) => [...current, {
      id: `attestation-${Date.now()}`,
      incidentId: attestIncident.id,
      userId: profile.id,
      campusId: profile.campusId,
      kind,
      createdAt: now,
    }]);
    setIncidents((current) => current.map((item) => item.id === attestIncident.id
      ? { ...item, confirmations: item.confirmations + 1 }
      : item));
    setAttestIncident(null);
  };

  return (
    <>
      <div className={styles.reportActions}>
        <button className={styles.reportButton} type="button" onClick={openReport}><Plus size={18} /> Report an issue</button>
        <div className={styles.privacy}><ShieldCheck size={17} /><span><strong>Public report, protected identity.</strong> Reporter details and private evidence are restricted to the reporter and authorised admins.</span></div>
      </div>

      <div className={styles.reportList}>
        {sorted.map((incident) => {
          const own = incident.reportedBy === profile?.id;
          const attested = attestations.some((item) => item.incidentId === incident.id && item.userId === profile?.id);
          return (
            <article className={styles.reportCard} key={incident.id}>
              <button className={styles.reportSummary} type="button" onClick={() => setDetail(incident)}>
                <span className={`${styles.dot} ${styles[incident.severity.toLowerCase()]}`} />
                <span className={styles.reportCopy}>
                  <span className={styles.meta}>{incident.category} · {incident.reportedAt}</span>
                  <strong>{incident.title}</strong>
                  <small>{incident.landmark}</small>
                </span>
                <StatusPill status={incident.status} />
                <span className={styles.chevron}>›</span>
              </button>
              <div className={styles.reportFooter}>
                <span><Radio size={14} /> {incident.confirmations} student attestations</span>
                {incident.status !== "Resolved" ? (
                  <button
                    type="button"
                    disabled={own || attested}
                    onClick={() => {
                      if (!profile) document.querySelector<HTMLButtonElement>(".account-button")?.click();
                      else setAttestIncident(incident);
                    }}
                  >
                    {own || attested ? <Check size={15} /> : <Plus size={15} />}
                    {own ? "Your report" : attested ? "Attested" : "Attest"}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {detail ? (
        <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}>
          <section className={styles.detailDialog} role="dialog" aria-modal="true" aria-labelledby="report-detail-title">
            <div className={styles.dialogTop}>
              <div><span>Campus report</span><h2 id="report-detail-title">{detail.title}</h2></div>
              <button type="button" onClick={() => setDetail(null)} aria-label="Close report"><X size={19} /></button>
            </div>
            <div className={styles.detailStatus}><span className={`${styles.severity} ${styles[detail.severity.toLowerCase()]}`}>{detail.severity} priority</span><StatusPill status={detail.status} /></div>

            {isAdmin ? (
              <section style={{ marginTop: 14, padding: 14, border: "1px solid #171715", borderRadius: 12, background: "#f7f7f3" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                  <ShieldCheck size={18} />
                  <div style={{ display: "grid", gap: 3, flex: 1 }}>
                    <strong style={{ fontSize: 13 }}>Admin controls</strong>
                    <small style={{ color: "#696963", lineHeight: 1.4 }}>
                      {nextStatus(detail.status)
                        ? `Change status: ${detail.status} → ${nextStatus(detail.status)}`
                        : "This case has reached the final status."}
                    </small>
                  </div>
                </div>
                {nextStatus(detail.status) ? (
                  <button
                    type="button"
                    onClick={advanceDetailStatus}
                    style={{ width: "100%", minHeight: 44, marginTop: 12, border: "1px solid #171715", borderRadius: 9, background: "#171715", color: "#fff", fontWeight: 900, cursor: "pointer" }}
                  >
                    {statusActionLabel(detail.status)}
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, fontSize: 12, fontWeight: 800 }}><CheckCircle2 size={16} /> Case resolved</div>
                )}
              </section>
            ) : null}

            <p className={styles.description}>{detail.description}</p>
            <div className={styles.detailGrid}>
              <span><MapPin size={16} /><span><small>Location</small><strong>{detail.landmark}</strong></span></span>
              <span><Clock3 size={16} /><span><small>Reported</small><strong>{detail.createdAt ? formatTimestamp(detail.createdAt) : detail.reportedAt}</strong></span></span>
              <span><Radio size={16} /><span><small>Community</small><strong>{detail.confirmations} attestations</strong></span></span>
              <span><AlertTriangle size={16} /><span><small>Category</small><strong>{detail.category}</strong></span></span>
            </div>

            <section className={styles.timeline}>
              <h3>Case timeline</h3>
              {detail.statusHistory?.length ? detail.statusHistory.map((event, index) => (
                <div className={styles.timelineRow} key={`${event.status}-${event.at}-${index}`}>
                  <i /><span><strong>{event.status}</strong><small>{formatTimestamp(event.at)} · {event.by === "admin" ? "Admin update" : "Report submitted"}</small></span>
                </div>
              )) : (
                <div className={styles.timelineRow}><i /><span><strong>{detail.status}</strong><small>{detail.reportedAt} · Exact status timestamps were not recorded for this earlier report.</small></span></div>
              )}
            </section>

            <section className={styles.evidenceBox}>
              <div><Camera size={17} /><span><strong>Photo evidence</strong><small>{detail.evidenceLabel ?? "No photo was attached to this report."}</small></span></div>
              {detailEvidenceState === "loading" ? <p>Checking evidence access…</p> : null}
              {detailEvidence ? <img src={detailEvidence.dataUrl} alt={`Evidence for ${detail.title}`} /> : null}
              {!detailEvidence && detail.evidenceLabel && detailEvidenceState === "private" ? <p>Photo is protected. The reporter and authorised admin can view the original evidence.</p> : null}
            </section>
          </section>
        </div>
      ) : null}

      {reportOpen && profile ? <ReportDialog profile={profile} onClose={() => setReportOpen(false)} onCreated={(incident) => setIncidents((current) => [...current, incident])} /> : null}
      {attestIncident ? <AttestationDialog incident={attestIncident} onClose={() => setAttestIncident(null)} onSubmit={submitAttestation} /> : null}
    </>
  );
}

function ReportDialog({ profile, onClose, onCreated }: { profile: UserProfile; onClose: () => void; onCreated: (incident: Incident) => void }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.description.trim() || !draft.landmark.trim() || busy) return;
    setBusy(true);
    setError("");
    const now = new Date().toISOString();
    const incident: Incident = {
      id: `incident-${Date.now()}`,
      title: draft.title.trim(),
      category: draft.category,
      description: draft.description.trim(),
      coordinates: places.find((place) => place.id === draft.placeId)?.coordinates ?? [6.59402, 3.99562],
      landmark: draft.landmark.trim(),
      reportedAt: "Just now",
      createdAt: now,
      confirmations: 1,
      severity: draft.category === "Safety" || draft.category === "Electrical hazard" ? "High" : "Medium",
      status: "Reported",
      statusHistory: [{ status: "Reported", at: now, by: "student" }],
      anonymous: draft.anonymous,
      campusId: profile.campusId,
      reportedBy: profile.id,
      evidenceLabel: draft.file ? "1 photo attached" : undefined,
    };

    try {
      onCreated(incident);
      await saveCaseReporter(incident.id, {
        name: profile.name,
        email: profile.email,
        matricNumber: profile.matricNumber,
        institutionId: profile.institutionId,
        campusId: profile.campusId,
        department: profile.department,
        level: profile.level,
      });
      if (draft.file) {
        const evidence = await compressPhoto(draft.file);
        await saveCaseEvidence(incident.id, evidence);
      }
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not finish saving this report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={styles.formDialog} role="dialog" aria-modal="true" aria-labelledby="new-report-title">
        <div className={styles.dialogTop}><div><span>New campus report</span><h2 id="new-report-title">What needs attention?</h2></div><button type="button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
        <form onSubmit={submit}>
          <label>Issue category<select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as IncidentCategory }))}>{incidentCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Short title<input required value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Burst pipe beside hostel walkway" /></label>
          <label>What happened?<textarea required rows={4} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Describe what happened and why it needs attention." /></label>
          <div className={styles.formRow}>
            <label>Pin report near<select value={draft.placeId} onChange={(event) => setDraft((current) => ({ ...current, placeId: event.target.value }))}>{places.filter((place) => place.dataQuality === "mapped").map((place) => <option value={place.id} key={place.id}>{place.name}</option>)}</select></label>
            <label>Nearest landmark<input required value={draft.landmark} onChange={(event) => setDraft((current) => ({ ...current, landmark: event.target.value }))} placeholder="Behind Admin Block" /></label>
          </div>
          <label className={styles.photo}><span><Camera size={17} /><span><strong>Add photo evidence</strong><small>Optional, but useful for verification.</small></span></span><input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" onChange={(event) => setDraft((current) => ({ ...current, file: event.target.files?.[0] ?? null }))} />{draft.file ? <small><FileImage size={13} /> {draft.file.name}</small> : null}</label>
          <label className={styles.anonymous}><input type="checkbox" checked={draft.anonymous} onChange={(event) => setDraft((current) => ({ ...current, anonymous: event.target.checked }))} /><EyeOff size={17} /><span><strong>Hide my name publicly</strong><small>Admins can still verify the account behind the report.</small></span></label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.formActions}><button type="button" onClick={onClose}>Cancel</button><button type="submit" disabled={busy}><Send size={16} /> {busy ? "Sending…" : "Send report"}</button></div>
        </form>
      </section>
    </div>
  );
}

function AttestationDialog({ incident, onClose, onSubmit }: { incident: Incident; onClose: () => void; onSubmit: (kind: AttestationKind) => void }) {
  const options: Array<[AttestationKind, string, string]> = [
    ["still-happening", "Still happening", "The issue is still present right now."],
    ["saw-it-too", "I saw this too", "You personally observed the reported issue."],
    ["looks-resolved", "Looks resolved", "The issue appears to have been fixed or cleared."],
  ];
  return (
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={styles.attestDialog} role="dialog" aria-modal="true">
        <div className={styles.dialogTop}><div><span>Community attestation</span><h2>What can you confirm?</h2><p>{incident.title}</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
        <div className={styles.attestOptions}>{options.map(([kind, title, copy]) => <button type="button" key={kind} onClick={() => onSubmit(kind)}><span><strong>{title}</strong><small>{copy}</small></span><span>›</span></button>)}</div>
      </section>
    </div>
  );
}
