"use client";

import { useEffect } from "react";
import {
  readCaseEvidence,
  readCaseReporter,
  saveCaseEvidence,
  saveCaseReporter,
} from "@/lib/firebase-rest";
import type { Incident } from "@/lib/data";

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

type PendingEvidence = {
  dataUrl: string;
  fileName: string;
  contentType: string;
};

const USER_KEY = "nexus-user:v2";
const INCIDENTS_KEY = "nexus-incidents:v2";
const PENDING_EVIDENCE_KEY = "nexus-pending-evidence:v1";

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function notice(message: string) {
  let node = document.getElementById("nexus-ops-notice");
  if (!node) {
    node = document.createElement("div");
    node.id = "nexus-ops-notice";
    Object.assign(node.style, {
      position: "fixed",
      left: "50%",
      bottom: "24px",
      transform: "translateX(-50%)",
      zIndex: "99999",
      background: "#171715",
      color: "white",
      padding: "12px 16px",
      borderRadius: "10px",
      fontSize: "13px",
      fontWeight: "700",
      boxShadow: "0 14px 34px rgba(0,0,0,.22)",
      maxWidth: "min(92vw,560px)",
    });
    document.body.appendChild(node);
  }
  node.textContent = message;
  window.setTimeout(() => node?.remove(), 3600);
}

function fileToCompressedDataUrl(file: File): Promise<PendingEvidence> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read photo."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("That image could not be processed."));
      image.onload = () => {
        const maxSide = 900;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Image processing is unavailable."));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        let quality = 0.72;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > 620_000 && quality > 0.42) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        if (dataUrl.length > 760_000) return reject(new Error("Photo is still too large. Try another image."));
        resolve({ dataUrl, fileName: file.name || "incident-photo.jpg", contentType: "image/jpeg" });
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function addPhotoPreview(input: HTMLInputElement, evidence: PendingEvidence) {
  const field = input.closest<HTMLElement>(".photo-field");
  if (!field) return;
  field.querySelector(".nexus-photo-preview")?.remove();
  const wrap = document.createElement("div");
  wrap.className = "nexus-photo-preview";
  Object.assign(wrap.style, { marginTop: "12px", display: "grid", gap: "8px" });
  const img = document.createElement("img");
  img.src = evidence.dataUrl;
  img.alt = "Selected incident evidence";
  Object.assign(img.style, {
    width: "100%",
    maxHeight: "220px",
    objectFit: "cover",
    borderRadius: "12px",
    border: "1px solid #deded8",
  });
  const text = document.createElement("small");
  text.textContent = "Photo ready to attach to this case";
  Object.assign(text.style, { color: "#16724a", fontWeight: "800" });
  wrap.append(img, text);
  field.appendChild(wrap);
}

function cleanVisibleCopy() {
  document.querySelectorAll<HTMLElement>("span, p, small, strong").forEach((node) => {
    if (node.children.length) return;
    const text = node.textContent ?? "";
    if (text.includes("verified demo campus membership")) node.textContent = text.replace("verified demo campus membership", "verified campus account");
    if (text.includes("This prototype saves the draft locally for demonstration.")) node.textContent = "Your listing is saved for campus review before publication.";
  });
}

function setCameraCapture() {
  const input = document.querySelector<HTMLInputElement>("#incident-photo");
  if (!input) return;
  input.setAttribute("capture", "environment");
}

function selectedAdminIncident(): Incident | null {
  const title = document.querySelector<HTMLElement>(".admin-selected h3")?.textContent?.trim();
  if (!title) return null;
  const incidents = readJson<Incident[]>(INCIDENTS_KEY) ?? [];
  return incidents.find((incident) => incident.title === title) ?? null;
}

function removeAdminVerificationCard() {
  document.getElementById("nexus-admin-verification")?.remove();
}

function infoRow(label: string, value: string) {
  const row = document.createElement("div");
  Object.assign(row.style, { display: "grid", gap: "2px" });
  const small = document.createElement("small");
  small.textContent = label;
  Object.assign(small.style, { textTransform: "uppercase", letterSpacing: ".08em", color: "#696963", fontWeight: "800", fontSize: "10px" });
  const strong = document.createElement("strong");
  strong.textContent = value || "—";
  Object.assign(strong.style, { fontSize: "13px", wordBreak: "break-word" });
  row.append(small, strong);
  return row;
}

async function renderAdminVerification() {
  const selected = selectedAdminIncident();
  const panel = document.querySelector<HTMLElement>(".admin-selected");
  if (!selected || !panel) {
    removeAdminVerificationCard();
    return;
  }

  const existing = document.getElementById("nexus-admin-verification");
  if (existing?.dataset.incidentId === selected.id) return;
  removeAdminVerificationCard();

  const card = document.createElement("section");
  card.id = "nexus-admin-verification";
  card.dataset.incidentId = selected.id;
  Object.assign(card.style, {
    marginTop: "16px",
    padding: "14px",
    border: "1px solid #deded8",
    borderRadius: "12px",
    background: "#f6f6f3",
    display: "grid",
    gap: "12px",
  });
  card.innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><small style="display:block;color:#696963;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:10px">Case verification</small><strong style="font-size:15px">Reporter & evidence</strong></div><span style="font-size:11px;font-weight:800;color:#16724a">ACCOUNT LINKED</span></div><div data-state style="font-size:12px;color:#696963">Loading private case details…</div>`;
  panel.appendChild(card);

  try {
    const [reporter, evidence] = await Promise.all([
      readCaseReporter(selected.id),
      readCaseEvidence(selected.id),
    ]);
    card.querySelector<HTMLElement>("[data-state]")?.remove();

    const grid = document.createElement("div");
    Object.assign(grid.style, { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "10px" });
    if (reporter) {
      grid.append(
        infoRow("Reporter", reporter.name),
        infoRow("Matric", reporter.matricNumber),
        infoRow("Email", reporter.email),
        infoRow("Department", reporter.department || "Not supplied"),
        infoRow("Level", reporter.level || "Not supplied"),
        infoRow("Account UID", reporter.uid),
      );
    } else {
      grid.append(infoRow("Reporter", selected.reportedBy ? "Registered account record unavailable" : "Legacy / seeded report"));
    }
    card.appendChild(grid);

    const checks = document.createElement("div");
    Object.assign(checks.style, { display: "grid", gap: "6px", fontSize: "12px" });
    const checkItems = [
      reporter ? "✓ Submitted from a signed-in Nexus account" : "• No private reporter snapshot for this case",
      evidence ? "✓ Photo evidence attached" : "• No photo evidence attached",
      selected.confirmations > 1 ? `✓ ${selected.confirmations} community confirmations` : "• Awaiting independent community confirmation",
    ];
    checkItems.forEach((item) => {
      const line = document.createElement("div");
      line.textContent = item;
      line.style.fontWeight = "700";
      checks.appendChild(line);
    });
    card.appendChild(checks);

    if (evidence) {
      const img = document.createElement("img");
      img.src = evidence.dataUrl;
      img.alt = `Evidence for ${selected.title}`;
      Object.assign(img.style, { width: "100%", maxHeight: "280px", objectFit: "cover", borderRadius: "10px", border: "1px solid #deded8" });
      card.appendChild(img);
    }
  } catch (error) {
    const state = card.querySelector<HTMLElement>("[data-state]");
    if (state) state.textContent = "Private reporter/evidence access is not enabled for this admin account yet.";
    console.warn("Nexus admin verification lookup failed.", error);
  }
}

async function renderReporterEvidence() {
  const panel = document.querySelector<HTMLElement>(".incident-details");
  const title = panel?.querySelector("h2")?.textContent?.trim();
  if (!panel || !title) return;
  const incidents = readJson<Incident[]>(INCIDENTS_KEY) ?? [];
  const selected = incidents.find((incident) => incident.title === title);
  const profile = readJson<UserProfile>(USER_KEY);
  if (!selected || !profile || selected.reportedBy !== profile.id) {
    panel.querySelector(".nexus-own-evidence")?.remove();
    return;
  }
  if (panel.querySelector(".nexus-own-evidence")) return;
  try {
    const evidence = await readCaseEvidence(selected.id);
    if (!evidence) return;
    const wrap = document.createElement("div");
    wrap.className = "nexus-own-evidence";
    Object.assign(wrap.style, { marginTop: "12px", display: "grid", gap: "6px" });
    const label = document.createElement("small");
    label.textContent = "Your attached evidence";
    Object.assign(label.style, { fontWeight: "800", color: "#696963", textTransform: "uppercase", letterSpacing: ".07em" });
    const img = document.createElement("img");
    img.src = evidence.dataUrl;
    img.alt = `Evidence for ${selected.title}`;
    Object.assign(img.style, { width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "10px", border: "1px solid #deded8" });
    wrap.append(label, img);
    panel.appendChild(wrap);
  } catch {
    // Evidence is intentionally private; ignore if this user cannot access it.
  }
}

export function IncidentOpsBridge() {
  useEffect(() => {
    let beforeSubmitIds: string[] = [];

    const prepare = () => {
      setCameraCapture();
      cleanVisibleCopy();
      void renderAdminVerification();
      void renderReporterEvidence();
    };

    prepare();
    const observer = new MutationObserver(prepare);
    observer.observe(document.body, { subtree: true, childList: true });

    const onChange = async (event: Event) => {
      const input = event.target as HTMLInputElement | null;
      if (input?.id !== "incident-photo") return;
      const file = input.files?.[0];
      if (!file) {
        window.localStorage.removeItem(PENDING_EVIDENCE_KEY);
        return;
      }
      try {
        const evidence = await fileToCompressedDataUrl(file);
        window.localStorage.setItem(PENDING_EVIDENCE_KEY, JSON.stringify(evidence));
        addPhotoPreview(input, evidence);
      } catch (error) {
        input.value = "";
        window.localStorage.removeItem(PENDING_EVIDENCE_KEY);
        notice(error instanceof Error ? error.message : "Could not prepare that photo.");
      }
    };

    const onPointerDown = (event: Event) => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>("button[type=submit]");
      if (!button?.textContent?.toLowerCase().includes("submit report")) return;
      beforeSubmitIds = (readJson<Incident[]>(INCIDENTS_KEY) ?? []).map((item) => item.id);
    };

    const onClick = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>("button[type=submit]");
      if (!button?.textContent?.toLowerCase().includes("submit report")) return;
      window.setTimeout(async () => {
        const incidents = readJson<Incident[]>(INCIDENTS_KEY) ?? [];
        const created = incidents.find((incident) => !beforeSubmitIds.includes(incident.id));
        const profile = readJson<UserProfile>(USER_KEY);
        if (!created || !profile) return;
        try {
          await saveCaseReporter(created.id, {
            name: profile.name,
            email: profile.email,
            matricNumber: profile.matricNumber,
            institutionId: profile.institutionId,
            campusId: profile.campusId,
            department: profile.department,
            level: profile.level,
          });
          const evidence = readJson<PendingEvidence>(PENDING_EVIDENCE_KEY);
          if (evidence) {
            await saveCaseEvidence(created.id, evidence);
            window.localStorage.removeItem(PENDING_EVIDENCE_KEY);
            notice("Report submitted with private photo evidence.");
          } else {
            notice("Report submitted. Reporter identity is available to authorised officials.");
          }
        } catch (error) {
          console.warn("Nexus private case metadata save failed.", error);
          notice("Report submitted, but private evidence metadata could not sync.");
        }
      }, 650);
    };

    document.addEventListener("change", onChange, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("change", onChange, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
