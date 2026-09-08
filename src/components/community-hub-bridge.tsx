"use client";

import { useEffect } from "react";
import {
  approveBoardSubmission,
  approveServiceSubmission,
  listApprovedBoardPosts,
  listApprovedServices,
  listBoardSubmissions,
  listReviews,
  listServiceSubmissions,
  rejectBoardSubmission,
  rejectServiceSubmission,
  submitBoardPost,
  submitReview,
  submitServiceListing,
  type CampusBoardPost,
  type CommunityServiceListing,
  type ServiceReview,
} from "@/lib/community-data";
import { hasFirebaseAdminRole } from "@/lib/firebase-rest";

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

const USER_KEY = "nexus-user:v2";

function readProfile() {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as UserProfile : null;
  } catch {
    return null;
  }
}

function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function flash(message: string) {
  let node = document.getElementById("nexus-community-flash");
  if (!node) {
    node = document.createElement("div");
    node.id = "nexus-community-flash";
    Object.assign(node.style, {
      position: "fixed", left: "50%", bottom: "24px", transform: "translateX(-50%)", zIndex: "100001",
      background: "#171715", color: "#fff", padding: "12px 16px", borderRadius: "10px", fontSize: "13px",
      fontWeight: "800", boxShadow: "0 14px 32px rgba(0,0,0,.22)", maxWidth: "min(92vw,560px)",
    });
    document.body.appendChild(node);
  }
  node.textContent = message;
  window.setTimeout(() => node?.remove(), 3600);
}

function overlayShell(title: string, subtitle: string) {
  document.getElementById("nexus-community-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "nexus-community-overlay";
  Object.assign(overlay.style, {
    position: "fixed", inset: "0", zIndex: "100000", background: "rgba(10,10,10,.58)", display: "grid",
    placeItems: "center", padding: "18px", overflow: "auto",
  });
  const panel = document.createElement("section");
  Object.assign(panel.style, {
    width: "min(900px,96vw)", maxHeight: "90vh", overflow: "auto", background: "#fff", borderRadius: "20px",
    padding: "22px", boxShadow: "0 30px 90px rgba(0,0,0,.28)", color: "#171715",
  });
  const head = document.createElement("div");
  Object.assign(head.style, { display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "start", marginBottom: "18px" });
  head.innerHTML = `<div><small style="text-transform:uppercase;letter-spacing:.1em;color:#73736d;font-weight:800">Nexus community</small><h2 style="margin:5px 0 4px;font-size:26px">${title}</h2><p style="margin:0;color:#62625d">${subtitle}</p></div>`;
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  Object.assign(close.style, { border: "1px solid #deded8", background: "white", borderRadius: "10px", width: "40px", height: "40px", fontSize: "24px", cursor: "pointer" });
  close.onclick = () => overlay.remove();
  head.appendChild(close);
  panel.appendChild(head);
  overlay.appendChild(panel);
  overlay.addEventListener("mousedown", (event) => { if (event.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  return panel;
}

function input(label: string, name: string, placeholder = "", required = true) {
  const wrap = document.createElement("label");
  Object.assign(wrap.style, { display: "grid", gap: "6px", fontSize: "13px", fontWeight: "800" });
  wrap.textContent = label;
  const control = document.createElement("input");
  control.name = name;
  control.placeholder = placeholder;
  control.required = required;
  Object.assign(control.style, { border: "1px solid #d8d8d2", borderRadius: "10px", padding: "11px 12px", font: "inherit" });
  wrap.appendChild(control);
  return wrap;
}

function textarea(label: string, name: string, placeholder = "") {
  const wrap = document.createElement("label");
  Object.assign(wrap.style, { display: "grid", gap: "6px", fontSize: "13px", fontWeight: "800" });
  wrap.textContent = label;
  const control = document.createElement("textarea");
  control.name = name;
  control.placeholder = placeholder;
  control.required = true;
  control.rows = 4;
  Object.assign(control.style, { border: "1px solid #d8d8d2", borderRadius: "10px", padding: "11px 12px", font: "inherit", resize: "vertical" });
  wrap.appendChild(control);
  return wrap;
}

function submitButton(text: string) {
  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = text;
  Object.assign(button.style, { border: "0", borderRadius: "10px", padding: "12px 16px", background: "#171715", color: "#fff", fontWeight: "800", cursor: "pointer" });
  return button;
}

async function openReview(listingId: string, businessName: string) {
  const profile = readProfile();
  if (!profile) return flash("Sign in before leaving a review.");
  const panel = overlayShell(`Review ${businessName}`, "Share a useful rating for other students. One review per account per listing.");
  const form = document.createElement("form");
  Object.assign(form.style, { display: "grid", gap: "14px" });
  const rating = document.createElement("select");
  rating.name = "rating";
  rating.innerHTML = `<option value="5">★★★★★ · Excellent</option><option value="4">★★★★☆ · Good</option><option value="3">★★★☆☆ · Okay</option><option value="2">★★☆☆☆ · Poor</option><option value="1">★☆☆☆☆ · Very poor</option>`;
  Object.assign(rating.style, { border: "1px solid #d8d8d2", borderRadius: "10px", padding: "11px 12px", font: "inherit" });
  const ratingWrap = document.createElement("label"); ratingWrap.textContent = "Rating"; ratingWrap.appendChild(rating);
  Object.assign(ratingWrap.style, { display: "grid", gap: "6px", fontSize: "13px", fontWeight: "800" });
  form.append(ratingWrap, textarea("Short review", "comment", "What was good or what should improve?"), submitButton("Publish review"));
  form.onsubmit = async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    try {
      await submitReview({ listingId, authorName: profile.name, rating: Number(data.get("rating")), comment: String(data.get("comment") ?? "").trim() });
      panel.parentElement?.remove();
      flash("Review published.");
      window.dispatchEvent(new Event("nexus-community-refresh"));
    } catch (error) { flash(error instanceof Error ? error.message : "Could not publish review."); }
  };
  panel.appendChild(form);
}

async function openBoard() {
  const panel = overlayShell("Campus board", "Verified business updates and approved student events in one place.");
  const posts = await listApprovedBoardPosts().catch(() => [] as CampusBoardPost[]);
  const profile = readProfile();

  const actions = document.createElement("div");
  Object.assign(actions.style, { display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px" });
  if (profile) {
    const add = document.createElement("button");
    add.type = "button"; add.textContent = "+ Submit announcement or event";
    Object.assign(add.style, { border: "1px solid #171715", background: "#171715", color: "white", padding: "10px 13px", borderRadius: "9px", fontWeight: "800", cursor: "pointer" });
    add.onclick = () => openBoardSubmission();
    actions.appendChild(add);
  }
  panel.appendChild(actions);

  const list = document.createElement("div");
  Object.assign(list.style, { display: "grid", gap: "12px" });
  if (!posts.length) list.innerHTML = `<div style="padding:24px;border:1px dashed #d5d5cf;border-radius:12px;color:#666">No approved announcements yet. Approved business updates and student events will appear here.</div>`;
  posts.sort((a,b) => b.submittedAt.localeCompare(a.submittedAt)).forEach((post) => {
    const card = document.createElement("article");
    Object.assign(card.style, { border: "1px solid #e0e0db", borderRadius: "13px", padding: "15px", display: "grid", gap: "7px" });
    card.innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px"><span style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#16724a">${post.type === "business-update" ? "Verified business update" : "Approved student event"}</span><span style="font-size:12px;color:#777">${post.dateLabel || "Campus update"}</span></div><strong style="font-size:17px">${post.title}</strong><p style="margin:0;color:#555;line-height:1.55">${post.body}</p><small style="color:#777">Posted by ${post.organizer}</small>`;
    list.appendChild(card);
  });
  panel.appendChild(list);
}

function openBoardSubmission() {
  const profile = readProfile();
  if (!profile) return flash("Sign in before submitting to the campus board.");
  const panel = overlayShell("Submit to campus board", "Posts stay pending until an administrator verifies them.");
  const form = document.createElement("form");
  Object.assign(form.style, { display: "grid", gap: "13px" });
  const typeWrap = document.createElement("label");
  typeWrap.textContent = "Post type";
  Object.assign(typeWrap.style, { display: "grid", gap: "6px", fontSize: "13px", fontWeight: "800" });
  const type = document.createElement("select");
  type.name = "type";
  type.innerHTML = `<option value="student-event">Student group event</option><option value="business-update">Business sale / service update / extended hours</option>`;
  Object.assign(type.style, { border: "1px solid #d8d8d2", borderRadius: "10px", padding: "11px 12px", font: "inherit" });
  typeWrap.appendChild(type);
  form.append(typeWrap, input("Title", "title", "e.g. Design exhibition this Friday"), textarea("Details", "body", "Give students the useful details."), input("Date / timing", "dateLabel", "e.g. Friday, 4 PM"), input("Organizer", "organizer", "Business or student group name"), submitButton("Send for verification"));
  form.onsubmit = async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    try {
      await submitBoardPost({
        type: String(data.get("type")) as "business-update" | "student-event",
        title: String(data.get("title") ?? "").trim(), body: String(data.get("body") ?? "").trim(), dateLabel: String(data.get("dateLabel") ?? "").trim(), organizer: String(data.get("organizer") ?? "").trim(),
        ownerName: profile.name, campusId: profile.campusId,
      });
      panel.parentElement?.remove(); flash("Submitted. It will appear after admin verification."); window.dispatchEvent(new Event("nexus-community-refresh"));
    } catch (error) { flash(error instanceof Error ? error.message : "Could not submit board post."); }
  };
  panel.appendChild(form);
}

function injectBoardNav() {
  document.querySelectorAll<HTMLElement>(".desktop-nav, .mobile-nav").forEach((nav) => {
    if (nav.querySelector(".nexus-board-nav")) return;
    const button = document.createElement("button");
    button.type = "button"; button.className = "nexus-board-nav"; button.textContent = "Campus board";
    button.onclick = () => { void openBoard(); };
    nav.appendChild(button);
  });
}

async function enhanceServices() {
  const section = document.querySelector<HTMLElement>(".services-section");
  if (!section || document.getElementById("nexus-community-services")) return;
  const [approved, reviews] = await Promise.all([listApprovedServices().catch(() => []), listReviews().catch(() => [])]);

  document.querySelectorAll<HTMLElement>(".service-card").forEach((card) => {
    const name = card.querySelector("h3")?.textContent?.trim();
    if (!name || card.querySelector(".nexus-service-trust")) return;
    card.querySelector(".demo-label")?.remove();
    const trust = document.createElement("div");
    trust.className = "nexus-service-trust";
    const listingId = `seed-${slug(name)}`;
    const listingReviews = reviews.filter((review) => review.listingId === listingId);
    const average = listingReviews.length ? listingReviews.reduce((sum, item) => sum + item.rating, 0) / listingReviews.length : 0;
    Object.assign(trust.style, { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "10px", flexWrap: "wrap" });
    trust.innerHTML = `<span style="font-size:11px;font-weight:900;color:#16724a">✓ VERIFIED LISTING</span><span style="font-size:12px;font-weight:800">${listingReviews.length ? `${average.toFixed(1)} ★ · ${listingReviews.length} review${listingReviews.length === 1 ? "" : "s"}` : "No reviews yet"}</span>`;
    const reviewButton = document.createElement("button"); reviewButton.type = "button"; reviewButton.textContent = "Rate & review";
    Object.assign(reviewButton.style, { border: "1px solid #d5d5cf", background: "white", borderRadius: "8px", padding: "7px 9px", fontSize: "11px", fontWeight: "800", cursor: "pointer" });
    reviewButton.onclick = () => { void openReview(listingId, name); };
    trust.appendChild(reviewButton); card.appendChild(trust);
  });

  const wrap = document.createElement("section"); wrap.id = "nexus-community-services";
  Object.assign(wrap.style, { marginTop: "26px", display: "grid", gap: "13px" });
  wrap.innerHTML = `<div><small style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#16724a">Community verified</small><h2 style="margin:4px 0 0">Student-submitted places</h2><p style="margin:5px 0 0;color:#666">Students can recommend useful places. Nothing appears publicly until an administrator approves the listing.</p></div>`;
  const grid = document.createElement("div"); Object.assign(grid.style, { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "12px" });
  if (!approved.length) grid.innerHTML = `<div style="padding:18px;border:1px dashed #d8d8d2;border-radius:12px;color:#666">No community-submitted businesses have been approved yet.</div>`;
  approved.forEach((listing) => {
    const listingReviews = reviews.filter((review) => review.listingId === listing.id);
    const average = listingReviews.length ? listingReviews.reduce((sum, item) => sum + item.rating, 0) / listingReviews.length : 0;
    const card = document.createElement("article");
    Object.assign(card.style, { border: "1px solid #dfdfd9", borderRadius: "14px", padding: "15px", display: "grid", gap: "8px", background: "white" });
    card.innerHTML = `<div style="display:flex;justify-content:space-between;gap:8px"><span style="font-size:11px;font-weight:900;color:#16724a">✓ VERIFIED BUSINESS</span><span style="font-size:12px;font-weight:800">${listingReviews.length ? `${average.toFixed(1)} ★ (${listingReviews.length})` : "New"}</span></div><strong style="font-size:17px">${listing.businessName}</strong><small style="color:#777">${listing.category}</small><p style="margin:0;color:#555">${listing.services}</p><div style="font-size:12px;color:#666">📍 ${listing.landmark}<br>🕒 ${listing.hours}</div>${listing.announcement ? `<div style="padding:9px;border-radius:9px;background:#f5f5f1;font-size:12px"><strong>Latest update</strong><br>${listing.announcement}</div>` : ""}`;
    const button = document.createElement("button"); button.type = "button"; button.textContent = "Rate & review";
    Object.assign(button.style, { justifySelf: "start", border: "1px solid #d5d5cf", background: "white", borderRadius: "8px", padding: "8px 10px", fontWeight: "800", cursor: "pointer" });
    button.onclick = () => { void openReview(listing.id, listing.businessName); }; card.appendChild(button); grid.appendChild(card);
  });
  wrap.appendChild(grid); section.appendChild(wrap);
}

function interceptServiceSubmission() {
  const form = document.querySelector<HTMLFormElement>(".provider-form-card form");
  if (!form || form.dataset.communityBound) return;
  form.dataset.communityBound = "true";
  form.addEventListener("submit", () => {
    const profile = readProfile();
    if (!profile) return;
    const data = new FormData(form);
    void submitServiceListing({
      businessName: String(data.get("businessName") ?? "").trim(), category: String(data.get("category") ?? "").trim(), services: String(data.get("services") ?? "").trim(), landmark: String(data.get("landmark") ?? "").trim(), hours: String(data.get("hours") ?? "").trim(), announcement: String(data.get("announcement") ?? "").trim(),
      ownerName: profile.name, ownerEmail: profile.email, campusId: profile.campusId,
    }).then(() => {
      flash("Service submitted for admin verification. It stays private until approved.");
      window.dispatchEvent(new Event("nexus-community-refresh"));
    }).catch((error) => flash(error instanceof Error ? error.message : "Could not submit service."));
  }, true);
}

async function injectAdminModeration() {
  const page = document.querySelector<HTMLElement>(".admin-page");
  if (!page || document.getElementById("nexus-community-moderation")) return;
  if (!(await hasFirebaseAdminRole().catch(() => false))) return;
  const [services, board] = await Promise.all([listServiceSubmissions().catch(() => []), listBoardSubmissions().catch(() => [])]);
  const section = document.createElement("section"); section.id = "nexus-community-moderation";
  Object.assign(section.style, { margin: "18px 0 32px", padding: "18px", border: "1px solid #dfdfd9", borderRadius: "15px", background: "white", display: "grid", gap: "18px" });
  section.innerHTML = `<div><small style="text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:#16724a">Trust & moderation</small><h2 style="margin:4px 0">Verification queue</h2><p style="margin:0;color:#666">Approve student-recommended businesses and campus-board posts before they become public.</p></div>`;

  const group = (title: string, items: Array<{ id: string; title: string; meta: string; approve: () => Promise<unknown>; reject: () => Promise<unknown> }>) => {
    const block = document.createElement("div"); block.innerHTML = `<h3 style="margin:0 0 9px">${title} · ${items.length}</h3>`;
    const list = document.createElement("div"); Object.assign(list.style, { display: "grid", gap: "9px" });
    if (!items.length) list.innerHTML = `<div style="color:#777;font-size:13px">Nothing waiting for review.</div>`;
    items.forEach((item) => {
      const row = document.createElement("div"); Object.assign(row.style, { border: "1px solid #e2e2dc", borderRadius: "11px", padding: "12px", display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "center" });
      row.innerHTML = `<div><strong>${item.title}</strong><small style="display:block;color:#777;margin-top:3px">${item.meta}</small></div>`;
      const actions = document.createElement("div"); Object.assign(actions.style, { display: "flex", gap: "6px" });
      const approve = document.createElement("button"); approve.type = "button"; approve.textContent = "Approve";
      const reject = document.createElement("button"); reject.type = "button"; reject.textContent = "Reject";
      [approve,reject].forEach((button) => Object.assign(button.style, { borderRadius: "8px", padding: "8px 10px", fontWeight: "800", cursor: "pointer" }));
      Object.assign(approve.style, { border: "0", background: "#16724a", color: "white" }); Object.assign(reject.style, { border: "1px solid #d6d6d0", background: "white" });
      approve.onclick = async () => { try { await item.approve(); row.remove(); flash("Approved and published."); window.dispatchEvent(new Event("nexus-community-refresh")); } catch (error) { flash(error instanceof Error ? error.message : "Could not approve."); } };
      reject.onclick = async () => { try { await item.reject(); row.remove(); flash("Submission rejected."); window.dispatchEvent(new Event("nexus-community-refresh")); } catch (error) { flash(error instanceof Error ? error.message : "Could not reject."); } };
      actions.append(approve,reject); row.appendChild(actions); list.appendChild(row);
    });
    block.appendChild(list); return block;
  };

  section.append(
    group("Service listings", services.map((item) => ({ id: item.id, title: item.businessName, meta: `${item.ownerName} · ${item.landmark} · ${item.services}`, approve: () => approveServiceSubmission(item.id), reject: () => rejectServiceSubmission(item.id) }))),
    group("Campus board", board.map((item) => ({ id: item.id, title: item.title, meta: `${item.ownerName} · ${item.type} · ${item.organizer}`, approve: () => approveBoardSubmission(item.id), reject: () => rejectBoardSubmission(item.id) }))),
  );
  page.appendChild(section);
}

export function CommunityHubBridge() {
  useEffect(() => {
    let refreshTimer = 0;
    const enhance = () => {
      injectBoardNav(); interceptServiceSubmission(); void enhanceServices(); void injectAdminModeration();
    };
    enhance();
    const observer = new MutationObserver(enhance); observer.observe(document.body, { subtree: true, childList: true });
    const refresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        document.getElementById("nexus-community-services")?.remove();
        document.getElementById("nexus-community-moderation")?.remove();
        enhance();
      }, 250);
    };
    window.addEventListener("nexus-community-refresh", refresh);
    return () => { observer.disconnect(); window.removeEventListener("nexus-community-refresh", refresh); window.clearTimeout(refreshTimer); };
  }, []);
  return null;
}
