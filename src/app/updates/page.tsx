import { NexusAuthShell } from "@/components/nexus-auth-shell";
import { NexusSiteHeader } from "@/components/nexus-site-header";
import { UpdatesClient } from "./updates-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function UpdatesPage() {
  return (
    <NexusAuthShell>
      <NexusSiteHeader />
      <UpdatesClient />
    </NexusAuthShell>
  );
}
