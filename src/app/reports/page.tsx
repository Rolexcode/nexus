import { NexusWorkspace } from "@/components/nexus-workspace";
import styles from "./reports.module.css";

export default function ReportsPage() {
  return (
    <div className={styles.route}>
      <NexusWorkspace target="reports" />
    </div>
  );
}
