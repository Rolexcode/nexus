import { NexusAuthShell } from "@/components/nexus-auth-shell";
import { UpdatesClient } from "./updates-client";

export default function UpdatesPage() {
  return (
    <NexusAuthShell>
      <UpdatesClient />
    </NexusAuthShell>
  );
}
