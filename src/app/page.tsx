import { TaskFirstHome } from "@/components/task-first-home";
import { NexusAuthShell } from "@/components/nexus-auth-shell";

export default function Home() {
  return (
    <NexusAuthShell>
      <TaskFirstHome />
    </NexusAuthShell>
  );
}
