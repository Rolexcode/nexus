"use client";

import { useEffect, useState } from "react";
import { LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { hasFirebaseAdminRole, subscribeToFirebaseAuth } from "@/lib/firebase-rest";
import { NexusWorkspaceCore } from "@/components/nexus-workspace";
import styles from "./admin.module.css";

export function AdminClient() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const check = async () => {
    setChecking(true);
    try {
      setIsAdmin(await hasFirebaseAdminRole());
    } catch {
      setIsAdmin(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void check();
    return subscribeToFirebaseAuth(() => { void check(); });
  }, []);

  if (checking) {
    return <section className={styles.state}><ShieldCheck size={24} /><strong>Checking admin access…</strong></section>;
  }

  if (!isAdmin) {
    return (
      <section className={styles.state}>
        <LockKeyhole size={28} />
        <h1>Admin access required</h1>
        <p>Sign in with a Nexus account that has been assigned the admin role.</p>
        <button type="button" className={`account-button ${styles.signIn}`}><UserRound size={17} /> Open my account</button>
      </section>
    );
  }

  return (
    <section className={styles.workspace}>
      <div className={styles.intro}>
        <span><ShieldCheck size={15} /> Administrator</span>
        <h1>Review campus reports</h1>
        <p>Select any report below to inspect its evidence, reporter details, student confirmations and update its status.</p>
      </div>
      <NexusWorkspaceCore target="admin" />
    </section>
  );
}
