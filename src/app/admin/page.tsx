import { NexusAuthShell } from "@/components/nexus-auth-shell";
import { NexusSiteHeader } from "@/components/nexus-site-header";
import { AdminClient } from "./admin-client";
import styles from "./admin.module.css";

export default function AdminPage() {
  return (
    <NexusAuthShell>
      <main className={styles.page}>
        <NexusSiteHeader />
        <AdminClient />
      </main>
    </NexusAuthShell>
  );
}
