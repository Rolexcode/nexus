"use client";

import { useEffect } from "react";
import { NexusApp } from "@/components/nexus-app";
import { NexusAuthShell } from "@/components/nexus-auth-shell";
import { IncidentOpsBridge } from "@/components/incident-ops-bridge";
import { CommunityHubBridge } from "@/components/community-hub-bridge";

type WorkspaceTarget = "services" | "reports" | "updates" | null;

const targetLabels: Record<Exclude<WorkspaceTarget, null>, string> = {
  services: "Services",
  reports: "Report & track",
  updates: "Campus board",
};

function InitialViewBridge({ target }: { target: WorkspaceTarget }) {
  useEffect(() => {
    if (!target) return;
    const label = targetLabels[target];
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
        .find((item) => item.textContent?.trim() === label);
      if (button) {
        button.click();
        window.clearInterval(timer);
      } else if (attempts >= 30) {
        window.clearInterval(timer);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [target]);

  return null;
}

function HomeNavigationGuard() {
  useEffect(() => {
    const goHome = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>("button");
      if (!button) return;
      const label = button.textContent?.trim();
      if (!button.classList.contains("brand-button") && label !== "Explore campus") return;

      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign("/");
    };

    document.addEventListener("click", goHome, true);
    return () => document.removeEventListener("click", goHome, true);
  }, []);

  return null;
}

export function NexusWorkspace({ target = null }: { target?: WorkspaceTarget }) {
  return (
    <NexusAuthShell>
      <NexusApp />
      <IncidentOpsBridge />
      <CommunityHubBridge />
      <InitialViewBridge target={target} />
      <HomeNavigationGuard />
    </NexusAuthShell>
  );
}
