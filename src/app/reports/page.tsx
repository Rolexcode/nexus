import Link from "next/link";
import { ArrowLeft, CheckCircle2, Radio, ShieldCheck, UserRound } from "lucide-react";
import { NexusWorkspace } from "@/components/nexus-workspace";
import styles from "./reports.module.css";

const steps = [
  ["1", "Report goes live", "Other students can see it immediately."],
  ["2", "Community confirms", "Students can attest, dispute or say it looks resolved."],
  ["3", "Admin adds trust", "Verification strengthens the report; it does not gate it."],
  ["4", "Track the outcome", "Follow the case from reported to resolved."],
] as const;

export default function ReportsPage() {
  return (
    <div className={styles.route}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Back to Nexus home">
          <span className={styles.mark}>N</span>
          <span><strong>Nexus</strong><small>LASU Epe</small></span>
        </Link>
        <button type="button" className={styles.accountButton}>
          <UserRound size={17} /> My account
        </button>
      </header>

      <main className={styles.shell}>
        <Link href="/" className={styles.back}><ArrowLeft size={16} /> Home</Link>

        <section className={styles.hero}>
          <span className={styles.kicker}><Radio size={15} /> Community reports</span>
          <h1>Report a campus problem.<br />See what happens next.</h1>
          <p>Reports appear immediately so students can confirm what they are seeing. Admin verification adds credibility and helps campus teams prioritise action.</p>

          <div className={styles.flow} aria-label="How Nexus reports work">
            {steps.map(([number, title, copy]) => (
              <article key={number}>
                <span>{number}</span>
                <div><strong>{title}</strong><small>{copy}</small></div>
              </article>
            ))}
          </div>

          <div className={styles.trustNote}>
            <ShieldCheck size={17} />
            <span><strong>Community-first reporting.</strong> A case does not wait for admin approval before students can attest to it.</span>
          </div>
        </section>

        <section className={styles.workspace} aria-label="Campus reports workspace">
          <div className={styles.workspaceHeading}>
            <div><span>Live on campus</span><h2>Current reports</h2></div>
            <span className={styles.live}><i /> Community activity</span>
          </div>
          <NexusWorkspace target="reports" />
        </section>

        <div className={styles.footerNote}><CheckCircle2 size={15} /> Reporter identity and evidence remain private to authorised review.</div>
      </main>
    </div>
  );
}
