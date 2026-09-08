"use client";

import { getValidFirebaseSession } from "@/lib/firebase-rest";

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

export type ServiceSubmissionStatus = "pending" | "approved" | "rejected";

export type CommunityServiceListing = {
  id: string;
  businessName: string;
  category: string;
  services: string;
  landmark: string;
  hours: string;
  announcement: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  campusId: string;
  status: ServiceSubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
};

export type ServiceReview = {
  id: string;
  listingId: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type BoardPostType = "business-update" | "student-event";
export type BoardPostStatus = "pending" | "approved" | "rejected";

export type CampusBoardPost = {
  id: string;
  type: BoardPostType;
  title: string;
  body: string;
  dateLabel: string;
  organizer: string;
  listingId?: string;
  ownerId: string;
  ownerName: string;
  campusId: string;
  status: BoardPostStatus;
  submittedAt: string;
  reviewedAt?: string;
};

type StoredDocument<T> = {
  fields?: {
    json?: { stringValue?: string };
  };
  name?: string;
};

type StoredList<T> = {
  documents?: StoredDocument<T>[];
};

function projectBase() {
  if (!FIREBASE_PROJECT_ID) throw new Error("Firebase project ID is missing.");
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/databases/(default)/documents`;
}

function docUrl(collection: string, id: string) {
  return `${projectBase()}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
}

function collectionUrl(collection: string) {
  return `${projectBase()}/${encodeURIComponent(collection)}?pageSize=100`;
}

async function listCollection<T>(collection: string, authenticated = false): Promise<T[]> {
  const session = authenticated ? await getValidFirebaseSession() : null;
  const response = await fetch(collectionUrl(collection), {
    headers: session ? { Authorization: `Bearer ${session.idToken}` } : undefined,
    cache: "no-store",
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Could not load ${collection} (${response.status}).`);
  const payload = await response.json() as StoredList<T>;
  return (payload.documents ?? []).flatMap((document) => {
    const raw = document.fields?.json?.stringValue;
    if (!raw) return [];
    try {
      return [JSON.parse(raw) as T];
    } catch {
      return [];
    }
  });
}

async function readDocument<T>(collection: string, id: string, authenticated = false): Promise<T | null> {
  const session = authenticated ? await getValidFirebaseSession() : null;
  const response = await fetch(docUrl(collection, id), {
    headers: session ? { Authorization: `Bearer ${session.idToken}` } : undefined,
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load ${collection}/${id} (${response.status}).`);
  const payload = await response.json() as StoredDocument<T>;
  const raw = payload.fields?.json?.stringValue;
  return raw ? JSON.parse(raw) as T : null;
}

async function writeDocument<T extends Record<string, unknown>>(
  collection: string,
  id: string,
  value: T,
  indexed: Record<string, { stringValue?: string; integerValue?: string }> = {},
) {
  const session = await getValidFirebaseSession();
  if (!session) throw new Error("Sign in to continue.");
  const response = await fetch(docUrl(collection, id), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        json: { stringValue: JSON.stringify(value) },
        ...indexed,
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  if (!response.ok) throw new Error(`Could not save ${collection} (${response.status}).`);
}

async function deleteDocument(collection: string, id: string) {
  const session = await getValidFirebaseSession();
  if (!session) throw new Error("Sign in to continue.");
  const response = await fetch(docUrl(collection, id), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.idToken}` },
  });
  if (!response.ok && response.status !== 404) throw new Error(`Could not delete ${collection} (${response.status}).`);
}

export async function submitServiceListing(input: Omit<CommunityServiceListing, "id" | "ownerId" | "status" | "submittedAt">) {
  const session = await getValidFirebaseSession();
  if (!session) throw new Error("Sign in before submitting a service.");
  const id = crypto.randomUUID();
  const listing: CommunityServiceListing = {
    ...input,
    id,
    ownerId: session.localId,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  await writeDocument("nexus-service-submissions", id, listing as unknown as Record<string, unknown>, {
    ownerId: { stringValue: session.localId },
    status: { stringValue: "pending" },
  });
  return listing;
}

export function listApprovedServices() {
  return listCollection<CommunityServiceListing>("nexus-services");
}

export function listServiceSubmissions() {
  return listCollection<CommunityServiceListing>("nexus-service-submissions", true);
}

export async function approveServiceSubmission(id: string) {
  const listing = await readDocument<CommunityServiceListing>("nexus-service-submissions", id, true);
  if (!listing) throw new Error("Service submission was not found.");
  const approved: CommunityServiceListing = {
    ...listing,
    status: "approved",
    reviewedAt: new Date().toISOString(),
  };
  await writeDocument("nexus-services", id, approved as unknown as Record<string, unknown>, {
    ownerId: { stringValue: approved.ownerId },
    status: { stringValue: "approved" },
  });
  await deleteDocument("nexus-service-submissions", id);
  return approved;
}

export async function rejectServiceSubmission(id: string) {
  await deleteDocument("nexus-service-submissions", id);
}

export function listReviews() {
  return listCollection<ServiceReview>("nexus-reviews");
}

export async function submitReview(input: Omit<ServiceReview, "id" | "userId" | "createdAt">) {
  const session = await getValidFirebaseSession();
  if (!session) throw new Error("Sign in before reviewing a service.");
  const id = `${input.listingId}_${session.localId}`;
  const review: ServiceReview = {
    ...input,
    id,
    userId: session.localId,
    createdAt: new Date().toISOString(),
  };
  await writeDocument("nexus-reviews", id, review as unknown as Record<string, unknown>, {
    userId: { stringValue: session.localId },
    listingId: { stringValue: input.listingId },
    rating: { integerValue: String(Math.max(1, Math.min(5, Math.round(input.rating)))) },
  });
  return review;
}

export async function submitBoardPost(input: Omit<CampusBoardPost, "id" | "ownerId" | "status" | "submittedAt">) {
  const session = await getValidFirebaseSession();
  if (!session) throw new Error("Sign in before posting to the campus board.");
  const id = crypto.randomUUID();
  const post: CampusBoardPost = {
    ...input,
    id,
    ownerId: session.localId,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  await writeDocument("nexus-board-submissions", id, post as unknown as Record<string, unknown>, {
    ownerId: { stringValue: session.localId },
    status: { stringValue: "pending" },
  });
  return post;
}

export function listApprovedBoardPosts() {
  return listCollection<CampusBoardPost>("nexus-board");
}

export function listBoardSubmissions() {
  return listCollection<CampusBoardPost>("nexus-board-submissions", true);
}

export async function approveBoardSubmission(id: string) {
  const post = await readDocument<CampusBoardPost>("nexus-board-submissions", id, true);
  if (!post) throw new Error("Board submission was not found.");
  const approved: CampusBoardPost = {
    ...post,
    status: "approved",
    reviewedAt: new Date().toISOString(),
  };
  await writeDocument("nexus-board", id, approved as unknown as Record<string, unknown>, {
    ownerId: { stringValue: approved.ownerId },
    status: { stringValue: "approved" },
  });
  await deleteDocument("nexus-board-submissions", id);
  return approved;
}

export async function rejectBoardSubmission(id: string) {
  await deleteDocument("nexus-board-submissions", id);
}
