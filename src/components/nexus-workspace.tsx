"use client";

import { useEffect } from "react";
import { NexusApp } from "@/components/nexus-app";
import { NexusAuthShell } from "@/components/nexus-auth-shell";
import { IncidentOpsBridge } from "@/components/incident-ops-bridge";
import { CommunityHubBridge } from "@/components/community-hub-bridge";

type WorkspaceTarget = "services" | "reports" | "updates" | "admin" | null;

const targetLabels: Record<Exclude<WorkspaceTarget, null>, string> = {
  services: "Services",
  reports: "Report & track",
  updates: "Campus board",
  admin: "Admin view",
};

function targetIsVisible(target: Exclude<WorkspaceTarget, null>) {
  if (target === "admin") return Boolean(document.querySelector(".admin-page"));
  if (target === "reports") return Boolean(document.querySelector(".incident-page"));
  if (target === "services") return Boolean(document.querySelector(".services-section"));
  return false;
}

function InitialViewBridge({ target }: { target: WorkspaceTarget }) {
  useEffect(() => {
    if (!target) return;
    const label = targetLabels[target];
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;

      if (targetIsVisible(target)) {
        window.clearInterval(timer);
        return;
      }

      const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
        .find((item) => item.textContent?.trim() === label);
      button?.click();

      if (attempts >= 40) window.clearInterval(timer);
    }, 150);
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

export function NexusWorkspaceCore({ target = null }: { target?: WorkspaceTarget }) {
  return (
    <>
      <NexusApp />
      <IncidentOpsBridge />
      <CommunityHubBridge />
      <InitialViewBridge target={target} />
      <HomeNavigationGuard />
    </>
  );
}

export function NexusWorkspace({ target = null }: { target?: WorkspaceTarget }) {
  return (
    <NexusAuthShell>
      <NexusWorkspaceCore target={target} />
    </NexusAuthShell>
  );
}
