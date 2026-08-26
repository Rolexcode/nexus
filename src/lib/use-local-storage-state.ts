"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";

export function useLocalStorageState<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    let restored = fallback;
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) restored = JSON.parse(saved) as T;
    } catch {
      // A damaged or blocked local store should never prevent Nexus from loading.
    }
    queueMicrotask(() => {
      if (!active) return;
      setValue(restored);
      setHydrated(true);
    });
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

  return [value, setValue, hydrated];
}
