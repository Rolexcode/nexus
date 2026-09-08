"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  readFirebaseState,
  shouldSyncWithFirebase,
  writeFirebaseState,
} from "@/lib/firebase-rest";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validIncident(value: unknown) {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.title === "string"
    && typeof value.category === "string"
    && typeof value.landmark === "string"
    && typeof value.reportedAt === "string"
    && typeof value.status === "string"
    && typeof value.severity === "string"
    && typeof value.campusId === "string"
    && typeof value.confirmations === "number"
    && Array.isArray(value.coordinates)
    && value.coordinates.length === 2
    && value.coordinates.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate));
}

function validAttestation(value: unknown) {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.incidentId === "string"
    && typeof value.userId === "string"
    && typeof value.campusId === "string"
    && typeof value.kind === "string";
}

function isCompatibleValue<T>(key: string, candidate: unknown, fallback: T): candidate is T {
  if (key === "nexus-incidents:v2") {
    return Array.isArray(candidate) && candidate.every(validIncident);
  }
  if (key === "nexus-attestations:v2") {
    return Array.isArray(candidate) && candidate.every(validAttestation);
  }
  if (key === "nexus-saved-places:v2" || key === "nexus-submitted-reports:v2") {
    return Array.isArray(candidate) && candidate.every((item) => typeof item === "string");
  }
  if (key === "nexus-provider-listings:v2") {
    return Array.isArray(candidate);
  }
  if (key === "nexus-user:v2") {
    if (candidate === null) return true;
    return isRecord(candidate)
      && typeof candidate.id === "string"
      && typeof candidate.name === "string"
      && candidate.name.trim().length > 0
      && typeof candidate.email === "string"
      && typeof candidate.campusId === "string";
  }
  if (Array.isArray(fallback)) return Array.isArray(candidate);
  if (fallback === null) return candidate === null || isRecord(candidate);
  return typeof candidate === typeof fallback;
}

export function useLocalStorageState<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      let restored = fallback;

      try {
        const saved = window.localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved) as unknown;
          if (isCompatibleValue(key, parsed, fallback)) {
            restored = parsed;
          } else {
            console.warn(`Ignoring incompatible local Nexus state for ${key}.`);
            window.localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.warn(`Ignoring unreadable local Nexus state for ${key}.`, error);
        try { window.localStorage.removeItem(key); } catch { /* storage may be blocked */ }
      }

      if (!active) return;
      setValue(restored);

      if (shouldSyncWithFirebase(key)) {
        try {
          const cloudValue = await readFirebaseState<unknown>(key);
          if (active && cloudValue !== null) {
            if (isCompatibleValue(key, cloudValue, fallback)) {
              restored = cloudValue;
              setValue(cloudValue);
              try {
                window.localStorage.setItem(key, JSON.stringify(cloudValue));
              } catch {
                // Local persistence is optional when browser storage is blocked.
              }
            } else {
              console.warn(`Ignoring incompatible Firebase Nexus state for ${key}; the last valid state will repair it.`);
            }
          }
        } catch (error) {
          console.warn("Nexus Firebase sync is unavailable; continuing with the last valid local state.", error);
        }
      }

      if (!active) return;
      setValue(restored);
      setHydrated(true);
      setCloudReady(true);
    };

    void restore();
    return () => { active = false; };
    // The fallback is intentionally captured only when this storage key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Nexus remains usable when browser storage is unavailable.
    }
  }, [hydrated, key, value]);

  useEffect(() => {
    if (!hydrated || !cloudReady || !shouldSyncWithFirebase(key)) return;
    const timer = window.setTimeout(() => {
      void writeFirebaseState(key, value).catch((error) => {
        console.warn("Nexus Firebase write failed; local state is still available.", error);
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [cloudReady, hydrated, key, value]);

  return [value, setValue, hydrated];
}
