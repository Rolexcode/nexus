"use client";

import { FormEvent, useRef, useState } from "react";
import { CheckCircle2, Send, ShieldCheck } from "lucide-react";
import { submitNexusSuggestion } from "@/lib/community-data";
import styles from "./feedback.module.css";

const categories = ["General feedback", "Something is confusing", "Map or directions", "Missing campus place", "Report or attestation", "Services or reviews", "Bug or technical issue", "Feature idea"];

export function FeedbackClient() {
  const [category, setCategory] = useState(categories[0]);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const startedAt = useRef(Date.now());

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || sent) return;
    setError("");
    if (message.trim().length < 8) {
      setError("Tell us a little more so we can understand your feedback.");
      return;
    }
    if (contact.trim() && !/^\S+@\S+\.\S+$/.test(contact.trim())) {
      setError("Enter a valid email address, or leave the contact field empty.");
      return;
    }
    if (website.trim()) {
      setSent(true);
      return;
    }
    if (Date.now() - startedAt.current < 1800) {
      setError("Please take a moment to complete the form.");
      return;
    }
    const lastSent = Number(window.localStorage.getItem("nexus-feedback-last") ?? "0");
    if (Date.now() - lastSent < 15000) {
      setError("Please wait a little before sending another suggestion.");
      return;
    }

    setBusy(true);
    try {
      await submitNexusSuggestion({ category, message: message.trim(), contact: contact.trim() });
      window.localStorage.setItem("nexus-feedback-last", String(Date.now()));
      setSent(true);
      setMessage("");
      setContact("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We couldn't send that feedback. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.shell}>
      <section className={styles.intro}>
        <span className={styles.eyebrow}>Help shape Nexus</span>
        <h1>What could make campus life easier?</h1>
        <p>Tell us what worked, what felt confusing, what is missing, or what we should improve. Real student feedback helps us make Nexus more useful.</p>
        <div className={styles.privacy}><ShieldCheck size={18} /><span><strong>No account needed.</strong> Your suggestion goes privately to the Nexus team. It won't appear publicly.</span></div>
      </section>

      <section className={styles.formCard}>
        {sent ? (
          <div className={styles.success} role="status">
            <CheckCircle2 size={32} />
            <h2>Thank you. We've got it.</h2>
            <p>Your feedback has been sent to the Nexus team. It will help guide what we improve next.</p>
            <button type="button" onClick={() => { setSent(false); setCategory(categories[0]); startedAt.current = Date.now(); }}>Send another suggestion</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className={styles.formHeading}><h2>Share your feedback</h2><span>Usually takes less than a minute</span></div>
            <label>
              What is this about?
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Your suggestion or experience
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={8} maxLength={2000} required rows={6} placeholder="For example: I couldn't find the library on the map, or it would help if…" />
              <small>{message.length}/2,000 characters</small>
            </label>
            <label>
              Email address <span className={styles.optional}>Optional</span>
              <input type="email" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Only if you'd like us to follow up" />
            </label>
            <div className={styles.honeypot} aria-hidden="true">
              <label>Leave this field empty<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
            </div>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            <button type="submit" disabled={busy || message.trim().length < 8}><Send size={17} /> {busy ? "Sending…" : "Send feedback"}</button>
            <p className={styles.footnote}>Please don't include passwords, private account details or sensitive personal information.</p>
          </form>
        )}
      </section>
    </div>
  );
}
