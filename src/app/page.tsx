import { NexusApp } from "@/components/nexus-app";
import { NexusAuthShell } from "@/components/nexus-auth-shell";
import { IncidentOpsBridge } from "@/components/incident-ops-bridge";

export default function Home() {
  return (
    <NexusAuthShell>
      <NexusApp />
      <IncidentOpsBridge />
    </NexusAuthShell>
  );
}
