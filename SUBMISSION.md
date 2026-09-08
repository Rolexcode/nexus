# Nexus — Campus Innovate Challenge 2026

## One-line pitch

Nexus turns scattered campus information and complaints into a trusted, location-aware system students can use to discover services, report problems, confirm what others see, and track campus response through resolution.

## Problem

Campus information is fragmented across WhatsApp groups, word of mouth and informal channels. Students can struggle to find reliable places and services, while physical problems such as damaged infrastructure, dark walkways or water leaks may be repeatedly reported without one shared record of where the problem is, how many people have confirmed it, or whether action has been taken.

## Solution

Nexus starts with LASU Epe and combines two connected surfaces:

1. **Campus discovery** — searchable places, useful services, map context and direction previews.
2. **Campus intelligence** — geotagged reports, privacy-aware identity, student attestations, visible incident status and an admin heatmap/action queue.

The core loop is:

**Discover → Report → Confirm → Prioritise → Resolve → See the outcome**

## Target users

- Students
- Campus officials and operations teams
- Campus service providers

## Prototype highlights

- Searchable LASU Epe map
- Service directory and provider listing flow
- Firebase email/password accounts with campus profiles
- Geotagged incident reports with optional photo evidence
- Public anonymity with accountable signed-in identity
- Campus-restricted attestations
- One attestation per account and no self-attestation
- Reported → Verified → In progress → Resolved lifecycle
- Admin incident metrics, heatmap and action panel
- Firebase-backed shared incidents and attestations across devices

## Architecture

- Next.js + React + TypeScript
- Leaflet + React Leaflet
- Browser local storage as a resilience/fallback layer
- Firebase Email/Password Authentication + Cloud Firestore REST for account identity and shared demo state
- Production authorization model documented in `BACKEND.md`

## Why it stands out

Nexus is not just a campus map and not just a complaint form. The differentiator is the **closed response loop**: a real place is tied to a report, community confirmation increases confidence, officials see the pattern and update action status, and students can see what happened next.

## Scope discipline

The competition prototype intentionally excludes jobs, freelance marketplace features, payments and CampusGig functionality. The focus is campus discovery, services, safety and operational accountability.

## Demo sequence

1. Search a campus place/service.
2. Create a LASU Epe Nexus account with email/password.
3. Submit a location-linked incident.
4. Use a second account/device to attest to it.
5. Open Admin View and show the heatmap + confirmation count.
6. Move the report through the response lifecycle.
7. Return to the student view and show the updated status.
