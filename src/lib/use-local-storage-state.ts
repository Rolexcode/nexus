"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  readFirebaseState,
  shouldSyncWithFirebase,
  writeFirebaseState,
} from "@/lib/firebase-rest";

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
        if (saved) restored = JSON.parse(saved) as T;
      } catch {
        // A damaged or blocked local store should never prevent Nexus from loading.
      }

      if (!active) return;
      setValue(restored);

      if (shouldSyncWithFirebase(key)) {
        try {
          const cloudValue = await readFirebaseState<T>(key);
          if (active && cloudValue !== null) {
            restored = cloudValue;
            setValue(cloudValue);
            try {
              window.localStorage.setItem(key, JSON.stringify(cloudValue));
            } catch {
              // Local persistence is optional when browser storage is blocked.
            }
          }
        } catch (error) {
          console.warn("Nexus Firebase sync is unavailable; continuing locally.", error);
        }
      }

      if (!active) return;
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
      // The prototype remains usable when storage is unavailable.
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
