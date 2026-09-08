# Nexus

Nexus is a campus intelligence platform starting with LASU Epe. It combines campus discovery with a closed-loop incident system: students can find useful places, report problems where they happen, confirm community reports, and track how campus officials respond.

## Why it exists

Campus information is fragmented across WhatsApp groups, word of mouth and informal channels. More importantly, physical problems such as damaged infrastructure, dark walkways or water leaks can be reported repeatedly without a clear shared record of where the problem is, how many people have confirmed it, or whether anyone is acting on it.

Nexus turns those scattered signals into structured campus intelligence.

## Core prototype

- Searchable LASU Epe campus map and place categories
- Place and service details with in-app direction previews
- Firebase email/password accounts tied to campus profiles
- Provider listings and service updates
- Geotagged campus incident reporting with optional photo evidence
- Private reporter identity with optional public anonymity
- Campus-restricted student attestations and one-attestation-per-user protection
- Incident lifecycle: Reported → Verified → In progress → Resolved
- Administrative metrics, incident heatmap and action workflow
- Firebase-backed shared incident and attestation state for multi-device demos

The prototype deliberately excludes jobs, freelance marketplace features, payments and CampusGig functionality.

## Demo flow

1. Open **Explore campus** and search for a place or service.
2. Open **Report & track**, create a LASU Epe account and submit an issue.
3. Sign in with a second account/device and attest to the same incident.
4. Open **Admin view** to see the incident on the heatmap, its confirmation count and the operational queue.
5. Update the incident through **Reported → Verified → In progress → Resolved**.
6. Return to **Report & track** to show the updated public status.

That closed loop is the core of Nexus: **see a campus problem → structure it → confirm it → act on it → make the response visible.**

## Firebase demo backend

Nexus uses Firebase Authentication and Cloud Firestore for the competition demo. Browser local storage remains as a resilience/fallback layer.

### Firebase Console setup

1. Create a Firebase project.
2. Create a **Cloud Firestore** database.
3. In **Authentication → Sign-in method**, enable **Email/Password** authentication and leave passwordless email-link sign-in off for the current prototype.
4. Copy the contents of `firestore.rules` into **Firestore Database → Rules** and publish them.
5. In **Project settings → General**, create/select a Web App and copy its Web API key and Project ID.

### Environment variables

Add these to `.env.local` for local development or to the Vercel project environment variables:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_web_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

These are Firebase Web configuration values, not admin credentials. Do not add service-account keys to the frontend.

## Account model

Browsing remains open. Reporting, attesting and listing a campus service require a signed-in Firebase account with a Nexus campus profile. The Firebase UID becomes the stable user identifier behind those actions, while a reporter may still choose to hide their name publicly.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Validate

```bash
pnpm lint
pnpm build
```

## Architecture

The frontend is built with Next.js, React, TypeScript, Leaflet and React Leaflet. Firebase email/password Authentication provides account identity, while shared hackathon-demo state syncs through Cloud Firestore using Firebase REST APIs. The production authorization model is documented in `BACKEND.md`.

## Data note

The included dataset is for product demonstration. Only locations explicitly marked as mapped use publicly available coordinates. All other internal campus pins must be verified on site before production use.
