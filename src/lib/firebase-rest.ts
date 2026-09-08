"use client";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const AUTH_CACHE_KEY = "nexus-firebase-auth:v2";
const AUTH_CHANGED_EVENT = "nexus-firebase-auth-changed";
const CLOUD_KEYS = new Set([
  "nexus-incidents:v2",
  "nexus-attestations:v2",
]);

export type FirebaseSession = {
  idToken: string;
  refreshToken: string;
  localId: string;
  email: string;
  expiresAt: number;
};

type FirestoreDocument = {
  fields?: {
    json?: { stringValue?: string };
  };
};

type IdentityResponse = {
  idToken: string;
  refreshToken: string;
  localId: string;
  email?: string;
  expiresIn?: string;
};

export function firebaseDemoEnabled() {
  return Boolean(FIREBASE_API_KEY && FIREBASE_PROJECT_ID);
}

export function shouldSyncWithFirebase(key: string) {
  return firebaseDemoEnabled() && CLOUD_KEYS.has(key);
}

function emitAuthChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function subscribeToFirebaseAuth(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(AUTH_CHANGED_EVENT, callback);
  return () => window.removeEventListener(AUTH_CHANGED_EVENT, callback);
}

function saveSession(data: IdentityResponse) {
  const session: FirebaseSession = {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    localId: data.localId,
    email: data.email ?? "",
    expiresAt: Date.now() + (Number(data.expiresIn ?? "3600") * 1000),
  };
  window.localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(session));
  emitAuthChanged();
  return session;
}

export function readFirebaseSession(): FirebaseSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_CACHE_KEY);
    return raw ? JSON.parse(raw) as FirebaseSession : null;
  } catch {
    return null;
  }
}

function firebaseMessage(code?: string) {
  if (!code) return "Firebase could not complete that request.";
  if (code.includes("EMAIL_EXISTS")) return "An account already exists for this email. Sign in instead.";
  if (code.includes("INVALID_LOGIN_CREDENTIALS") || code.includes("INVALID_PASSWORD") || code.includes("EMAIL_NOT_FOUND")) {
    return "That email or password is incorrect.";
  }
  if (code.includes("WEAK_PASSWORD")) return "Use a password with at least 6 characters.";
  if (code.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) return "Too many attempts. Try again shortly.";
  if (code.includes("USER_DISABLED")) return "This account has been disabled.";
  return code.replaceAll("_", " ").toLowerCase();
}

async function identityRequest(path: string, body: Record<string, unknown>) {
  if (!FIREBASE_API_KEY) throw new Error("Firebase is not configured yet.");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${path}?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, returnSecureToken: true }),
    },
  );
  const payload = await response.json() as IdentityResponse & { error?: { message?: string } };
  if (!response.ok) throw new Error(firebaseMessage(payload.error?.message));
  return saveSession(payload);
}

export async function createFirebaseAccount(email: string, password: string) {
  return identityRequest("accounts:signUp", {
    email: email.trim().toLowerCase(),
    password,
  });
}

export async function signInFirebaseAccount(email: string, password: string) {
  return identityRequest("accounts:signInWithPassword", {
    email: email.trim().toLowerCase(),
    password,
  });
}

export function signOutFirebaseAccount() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_CACHE_KEY);
  emitAuthChanged();
}

async function refreshSession(session: FirebaseSession) {
  if (!FIREBASE_API_KEY || !session.refreshToken) return null;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: session.refreshToken,
  });
  const response = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (!response.ok) {
    signOutFirebaseAccount();
    return null;
  }
  const data = await response.json() as {
    id_token: string;
    refresh_token: string;
    user_id: string;
    expires_in?: string;
  };
  return saveSession({
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    localId: data.user_id,
    email: session.email,
    expiresIn: data.expires_in,
  });
}

export async function getValidFirebaseSession() {
  const session = readFirebaseSession();
  if (!session) return null;
  if (session.expiresAt > Date.now() + 60_000) return session;
  return refreshSession(session);
}

function demoDocumentUrl(key: string) {
  if (!FIREBASE_PROJECT_ID) throw new Error("Firebase project ID is missing.");
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/databases/(default)/documents/nexus-demo/${encodeURIComponent(key)}`;
}

function profileDocumentUrl(uid: string) {
  if (!FIREBASE_PROJECT_ID) throw new Error("Firebase project ID is missing.");
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/databases/(default)/documents/nexus-users/${encodeURIComponent(uid)}`;
}

export async function readFirebaseState<T>(key: string): Promise<T | null> {
  if (!shouldSyncWithFirebase(key)) return null;
  const session = await getValidFirebaseSession();
  const response = await fetch(demoDocumentUrl(key), {
    headers: session ? { Authorization: `Bearer ${session.idToken}` } : undefined,
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore read failed (${response.status}).`);
  const document = await response.json() as FirestoreDocument;
  const raw = document.fields?.json?.stringValue;
  return raw ? JSON.parse(raw) as T : null;
}

export async function writeFirebaseState<T>(key: string, value: T) {
  if (!shouldSyncWithFirebase(key)) return;
  const session = await getValidFirebaseSession();
  if (!session) return;
  const response = await fetch(demoDocumentUrl(key), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.idToken}`,
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

export async function saveFirebaseProfile<T>(profile: T) {
  const session = await getValidFirebaseSession();
  if (!session) throw new Error("Sign in before saving your campus profile.");
  const response = await fetch(profileDocumentUrl(session.localId), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        json: { stringValue: JSON.stringify(profile) },
        email: { stringValue: session.email },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  if (!response.ok) throw new Error(`Campus profile save failed (${response.status}).`);
}

export async function readFirebaseProfile<T>(): Promise<T | null> {
  const session = await getValidFirebaseSession();
  if (!session) return null;
  const response = await fetch(profileDocumentUrl(session.localId), {
    headers: { Authorization: `Bearer ${session.idToken}` },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Campus profile read failed (${response.status}).`);
  const document = await response.json() as FirestoreDocument;
  const raw = document.fields?.json?.stringValue;
  return raw ? JSON.parse(raw) as T : null;
}
