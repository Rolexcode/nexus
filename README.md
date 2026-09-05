# Nexus

Nexus is a campus intelligence platform starting with LASU Epe. It helps students discover campus places and services, report problems where they happen, confirm community reports, and track how campus officials respond.

## Core prototype

- Searchable campus map and place categories
- Place and service details with in-app direction previews
- Optional student accounts with institution and campus selection
- Provider listings and service updates
- Geotagged campus incident reporting
- Private reporter identity with optional public anonymity
- Campus-restricted student attestations and incident status tracking
- Administrative incident metrics, heatmap, and action workflow

The prototype deliberately excludes jobs, freelance marketplace features, payments, and CampusGig functionality.

The current account, report and attestation state is stored locally for frontend demonstration. See [BACKEND.md](BACKEND.md) for the server-enforced campus membership and data model required before production.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validate

```bash
pnpm lint
pnpm build
```

## Data note

The included dataset is for product demonstration. Only locations explicitly marked as mapped use publicly available coordinates. All other internal campus pins must be verified on site before production use.
