# Nexus

Nexus is a campus intelligence platform starting with LASU Epe. It combines campus discovery with a closed-loop incident system: students can find useful places, report problems where they happen, confirm community reports, and track how campus officials respond.

## Why it exists

Campus information is fragmented across WhatsApp groups, word of mouth and informal channels. More importantly, physical problems such as damaged infrastructure, dark walkways or water leaks can be reported repeatedly without a clear shared record of where the problem is, how many people have confirmed it, or whether anyone is acting on it.

Nexus turns those scattered signals into structured campus intelligence.

## Core prototype

- Searchable LASU Epe campus map and place categories
- Place and service details with in-app direction previews
- Optional student accounts with institution and campus selection
- Provider listings and service updates
- Geotagged campus incident reporting with optional photo evidence
- Private reporter identity with optional public anonymity
- Campus-restricted student attestations and one-attestation-per-user protection
- Incident lifecycle: Reported → Verified → In progress → Resolved
- Administrative metrics, incident heatmap and action workflow
- Optional Firebase-backed shared incident and attestation state for multi-device demos

The prototype deliberately excludes jobs, freelance marketplace features, payments and CampusGig functionality.

## Demo flow

1. Open **Explore campus** and search for a place or service.
2. Open **Report & track**, create a LASU Epe demo account and submit an issue.
3. A second demo account can attest to the same incident.
4. Open **Admin view** to see the incident on the heatmap, its confirmation count and the operational queue.
5. Update the incident through **Reported → Verified → In progress → Resolved**.
6. Return to **Report & track** to show the updated public status.

That closed loop is the core of Nexus: **see a campus problem → structure it → confirm it → act on it → make the response visible.**

## Optional Firebase demo backend

Nexus works without Firebase by falling back to browser local storage. For the competition demo, Firebase can make incidents and attestations shared across devices.

### Firebase Console setup

1. Create a Firebase project.
2. Create a **Cloud Firestore** database.
3. In **Authentication → Sign-in method**, enable **Anonymous** authentication.
4. Copy the contents of `firestore.rules` into **Firestore Database → Rules** and publish them.
5. In **Project settings → General**, create/select a Web App and copy its Web API key and Project ID.

### Environment variables

Add these to `.env.local` for local development or to your Vercel project environment variables:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_web_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

These are Firebase Web configuration values, not admin credentials. Do not add service-account keys to the frontend.

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

The current frontend is built with Next.js, React, TypeScript, Leaflet and React Leaflet. Shared hackathon-demo state can optionally sync through Firebase Authentication + Cloud Firestore using the Firebase REST APIs. The production authorization model is documented in `BACKEND.md`.

## Data note

The included dataset is for product demonstration. Only locations explicitly marked as mapped use publicly available coordinates. All other internal campus pins must be verified on site before production use.
