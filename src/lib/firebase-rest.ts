"use client";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const AUTH_CACHE_KEY = "nexus-firebase-anon-auth:v1";
const CLOUD_KEYS = new Set([
  "nexus-incidents:v2",
  "nexus-attestations:v2",
]);

type AuthCache = {
  idToken: string;
  localId: string;
  expiresAt: number;
};

type FirestoreDocument = {
  fields?: {
    json?: { stringValue?: string };
  };
};

export function firebaseDemoEnabled() {
  return Boolean(FIREBASE_API_KEY && FIREBASE_PROJECT_ID);
}

export function shouldSyncWithFirebase(key: string) {
  return firebaseDemoEnabled() && CLOUD_KEYS.has(key);
}

function readAuthCache(): AuthCache | null {
  try {
    const raw = window.localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as AuthCache;
    if (!cache.idToken || cache.expiresAt < Date.now() + 60_000) return null;
    return cache;
  } catch {
    return null;
  }
}

async function getAnonymousIdToken() {
  const cached = readAuthCache();
  if (cached) return cached.idToken;
  if (!FIREBASE_API_KEY) return null;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    },
  );

  if (!response.ok) throw new Error(`Firebase anonymous auth failed (${response.status}).`);

  const data = await response.json() as {
    idToken: string;
    localId: string;
    expiresIn?: string;
  };
  const cache: AuthCache = {
    idToken: data.idToken,
    localId: data.localId,
    expiresAt: Date.now() + (Number(data.expiresIn ?? "3600") * 1000),
  };
  window.localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
  return cache.idToken;
}

function documentUrl(key: string) {
  if (!FIREBASE_PROJECT_ID) throw new Error("Firebase project ID is missing.");
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/databases/(default)/documents/nexus-demo/${encodeURIComponent(key)}`;
}

export async function readFirebaseState<T>(key: string): Promise<T | null> {
  if (!shouldSyncWithFirebase(key)) return null;
  const idToken = await getAnonymousIdToken();
  if (!idToken) return null;

  const response = await fetch(documentUrl(key), {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore read failed (${response.status}).`);

  const document = await response.json() as FirestoreDocument;
  const raw = document.fields?.json?.stringValue;
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function writeFirebaseState<T>(key: string, value: T) {
  if (!shouldSyncWithFirebase(key)) return;
  const idToken = await getAnonymousIdToken();
  if (!idToken) return;

  const response = await fetch(documentUrl(key), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        json: { stringValue: JSON.stringify(value) },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });

  if (!response.ok) throw new Error(`Firestore write failed (${response.status}).`);
}
