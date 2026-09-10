import { NexusAuthShell } from "@/components/nexus-auth-shell";
import { NexusSiteHeader } from "@/components/nexus-site-header";
import { ServicesClient } from "./services-client";
import styles from "./services.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ServicesPage() {
  return (
    <NexusAuthShell>
      <main className={styles.page}>
        <NexusSiteHeader />
        <div className={styles.shell}>
          <ServicesClient />
        </div>
      </main>
    </NexusAuthShell>
  );
}
