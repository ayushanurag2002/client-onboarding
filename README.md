# Allocations · Client Onboarding (internal tool)

An internal tool for onboarding fund managers (GPs, syndicate leads, family offices) onto [allocations.com](https://www.allocations.com) — from first intake call to going live. **Next.js frontend only, with local dummy data** (no backend, no API keys).

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 with a custom light/dark design system
- Zustand (persisted to `localStorage`) for state + business rules
- Recharts · lucide-react

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Deploy to Vercel

Push to a Git repo, import in Vercel with the **Next.js** preset, no environment variables. Each visitor gets the seeded demo dataset in their own browser; **Settings → Reset demo data** restores it.

## What's inside

| Area | What you can do |
| --- | --- |
| Dashboard | Active onboardings, go-lives, avg days to live, SLA breaches, pipeline by stage, clients by type, attention list, kick-off calls, team load, activity |
| Pipeline | Kanban across `Intake → Verification → Agreements → Setup → Launch → Live` with **drag-and-drop** — stage gates are enforced on drop |
| Clients | Searchable list; 4-step intake wizard that generates the checklist, document requests and kick-off task |
| Client detail | Stage stepper with blockers, per-stage checklist, KYB documents, beneficial owners, sanctions/PEP/adverse-media screening, plan & pricing, e-signature agreements, entity / bank / workspace setup, admin invites, contacts, notes & activity |
| Tasks | Grouped by due date, filter by assignee, auto-created by workflow steps |
| Documents | Cross-client document queue: requested → received → verified / rejected |
| Team | Specialist capacity, utilisation, SLA breaches, assignments |
| Reports | Stage funnel, cycle time vs. SLA, lead source, expected AUM and first-year revenue, CSV export |
| Settings | Theme, checklist template, reset demo data |

## Business rules enforced

- Each stage has required checklist items; a client **cannot advance** until they are done. The "Advance" button and the pipeline drop both report the exact blockers.
- Checklist items marked **auto** complete from underlying records: a verified document, an approved screening, a signed agreement, a formed entity, an opened bank account, a provisioned workspace, an accepted invite.
- **Verification**: formation docs, government ID and proof of address must be *verified* (not just received); every owner with ≥25% must be KYC-verified and ≥75% of ownership declared; screening must be *approved*. Approving a screening with hits requires a written rationale and raises the risk rating to high; sanctions hits can never be approved; rejecting a screening churns the client. Adding a new owner invalidates an approved screening.
- **Agreements** can only be sent once the client has reached the Agreements stage; MSA and order form must be signed. Plan/pricing is locked after that.
- **Setup**: a bank application requires a formed entity; workspace invites require a provisioned workspace; at least one accepted invite is needed before Launch.
- Stage moves are one step at a time (forward or back). Clients on hold or churned cannot advance. Going live closes the client's open tasks.
- Every stage has an SLA (3/7/5/7/5 days); breaches surface on the dashboard, sidebar, notifications and team page.
- Every mutation is written to the activity log.

Keyboard: `⌘K` / `Ctrl+K` opens global search.
