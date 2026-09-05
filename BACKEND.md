# Nexus backend contract

Nexus browsing remains public. The backend is required for every action that changes shared campus information: account verification, incident submission, attestation, service listings, moderation and notifications.

## Core records

### User

- `id`
- `name`
- `email`
- `matric_number`
- `department` (optional)
- `level` (optional)
- timestamps

### Campus membership

- `id`
- `user_id`
- `institution_id`
- `campus_id`
- `status`: `pending`, `verified` or `rejected`
- `verification_method`
- `verified_at` and `verified_by` (optional)

Membership is separate from the user so a future user can belong to more than one campus without duplicating the account.

### Incident

- `id`
- `campus_id`
- `reported_by`
- category, title and description
- latitude and longitude
- nearby place and landmark text
- public anonymity flag
- evidence object keys
- status and timestamps

### Incident attestation

- `id`
- `incident_id`
- `user_id`
- `campus_id`
- `kind`: `still-happening`, `saw-it-too` or `looks-resolved`
- timestamp

Add a unique database constraint on `(incident_id, user_id)`.

## Authorisation rules

The server must enforce these rules even when the frontend already hides or disables an action:

1. Anyone may read public LASU Epe places, services and incidents.
2. Saving data across devices requires an authenticated account.
3. Submitting a LASU Epe incident requires a verified `lasu-epe` membership.
4. Attesting requires a verified membership whose `campus_id` matches the incident.
5. A reporter cannot attest to their own incident.
6. One user can attest only once per incident.
7. Only authorised campus staff may change official incident status or moderate evidence.
8. Evidence uploads use signed upload URLs, private storage and validated file types and sizes.

## Suggested API boundary

- `POST /auth/register`
- `POST /auth/verify-email`
- `GET /me`
- `POST /campus-memberships`
- `GET /campuses/:campusId/incidents`
- `POST /campuses/:campusId/incidents`
- `POST /incidents/:incidentId/attestations`
- `PATCH /incidents/:incidentId/status` (staff only)
- `POST /uploads/evidence-url`

Return `401` when no account is signed in and `403` when the account exists but lacks the matching verified campus membership.

## Direction data

The frontend currently provides approximate landmark guidance from mapped place coordinates. Exact on-campus turn-by-turn routing requires the surveyed walkway network as GeoJSON, KML or a shapefile. Import paths as graph nodes and edges, then run A* or Dijkstra over walkable segments. Do not present straight-line geometry as a verified walkway route.

## Explicitly out of scope

Nexus does not include job posts, gigs, applications, opportunity matching or payments.
