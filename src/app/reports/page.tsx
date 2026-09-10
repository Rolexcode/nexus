import Link from "next/link";
import { ArrowLeft, CheckCircle2, Radio, ShieldCheck } from "lucide-react";
import { NexusAuthShell } from "@/components/nexus-auth-shell";
import { NexusSiteHeader } from "@/components/nexus-site-header";
import { ReportsClient } from "./reports-client";
import styles from "./reports.module.css";

const steps = [
  ["1", "Report goes live", "Other students can see it immediately."],
  ["2", "Community confirms", "Students can attest or say it looks resolved."],
  ["3", "Admin adds trust", "Verification strengthens the report; it does not gate it."],
  ["4", "Track the outcome", "Every admin status change gets a timestamp."],
] as const;

export default function ReportsPage() {
  return (
    <NexusAuthShell>
      <div className={styles.route}>
        <NexusSiteHeader />

        <main className={styles.shell}>
          <Link href="/" className={styles.back}><ArrowLeft size={16} /> Home</Link>

          <section className={styles.hero}>
            <span className={styles.kicker}><Radio size={15} /> Community reports</span>
            <h1>Report a campus problem.<br />See what happens next.</h1>
            <p>Reports appear immediately so students can confirm what they are seeing. Open any report to see its full description, location, evidence state and case timeline.</p>

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
            <ReportsClient />
          </section>

          <div className={styles.footerNote}><CheckCircle2 size={15} /> The map now stays on the dedicated Map page. Reports focus only on cases and evidence.</div>
        </main>
      </div>
    </NexusAuthShell>
  );
}
