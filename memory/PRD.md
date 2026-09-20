# BitNex Technologies Website & Client Portal PRD

## Original problem statement
Reimagine BitNex Technologies as a premium, international technology company website for bitnextechnologies.com, with a public website and client project portal foundation. The website must be lightweight, responsive, accessible, truthful, technology-led, and must never mention confidential products. Portal information supplied: +92 339 5010115, hello@bitnextechnologies.com, Lahore Pakistan and Canton Ohio USA addresses.

## Architecture decisions
- React 19 + React Router frontend with reusable sections and CSS design tokens.
- FastAPI + MongoDB backend using existing environment URLs only.
- Cookie-based JWT sessions for email/password auth, with role-ready user records.
- Content is component/data driven and concept work is labeled; no invented clients, testimonials, metrics, or partnerships.

## Personas
- Prospective business leader exploring software, AI, commerce, or operations support.
- Existing BitNex client checking project progress, tasks, files, messages, and invoices.
- BitNex admin managing future client workspaces.

## Core requirements
- Public home experience with capabilities, AI demo, process, work concepts, insights, intake, theme toggle, contact details.
- Portal foundation with projects, milestones/status presentation, activity, tasks, invoices, and role-aware auth foundation.
- Responsive, WCAG-minded, reduced-motion support, performance-conscious styling, all key interactions marked with data-testid.

## Implemented (2026-03-17)
- Replaced starter splash with premium BitNex public website.
- Added light/dark theme, technology ecosystem hero, capability cards, demo assistant, work concepts, process, insights, intake form, footer, and responsive breakpoints.
- Added FastAPI auth, seeded admin, portal overview API, intake API, and client portal dashboard.
- Added auth testing notes and admin test credential record.

## Prioritized backlog
- P0: Connect real client records, files, messages, milestones, invoice records, and admin CRUD to MongoDB.
- P0: Configure and implement real magic-link email delivery and Google OAuth.
- P1: Add dedicated service, industry, work, about, careers, insight, privacy, and terms routes with unique metadata.
- P1: Add object storage for client uploads and server-side file permission checks.
- P2: Add privacy-conscious analytics event sink and approved testimonials/social links.

## Next tasks
1. Wire admin project management screens and client-specific data isolation.
2. Add real integrations only after provider credentials and approved content are supplied.
3. Expand SEO metadata, sitemap, structured data, and content pages.