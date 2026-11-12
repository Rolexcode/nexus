import { NexusAuthShell } from "@/components/nexus-auth-shell";
import { NexusSiteHeader } from "@/components/nexus-site-header";
import { FeedbackClient } from "./feedback-client";
import styles from "./feedback.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function FeedbackPage() {
  return (
    <NexusAuthShell>
      <main className={styles.page}>
        <NexusSiteHeader />
        <FeedbackClient />
      </main>
    </NexusAuthShell>
  );
}
