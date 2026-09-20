# Authentication Testing Playbook

1. Login with the admin credentials in `/app/memory/test_credentials.md` at `/portal/login`.
2. Confirm `/api/auth/me` returns the authenticated role and `/api/portal/overview` returns projects, activity, tasks, and invoices.
3. Confirm logout returns the user to `/portal/login`.
4. Confirm incorrect credentials show an accessible error and do not enter the portal.
5. Magic-link and Google buttons currently show clear setup messaging until their email/OAuth providers are configured.