import { NexusApp } from "@/components/nexus-app";
import { NexusAuthShell } from "@/components/nexus-auth-shell";

export default function Home() {
  return (
    <NexusAuthShell>
      <NexusApp />
    </NexusAuthShell>
  );
}
