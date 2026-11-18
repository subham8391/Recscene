# Supabase project for Recscene accounts

Sign-in is Google through Supabase Auth (docs/DECISIONS.md, 2026-11-18). This folder holds the schema; the hosted project is set up once by hand.

## Hosted project (once)
1. Create a Supabase project named **Recscene** (same organisation as Sparehour is fine).
2. **Authentication › Providers › Google**: enable it and paste a Google OAuth client id and secret. In Google Cloud the client is a *Web application*; its authorised redirect URI is the project's callback, `https://<project-ref>.supabase.co/auth/v1/callback`.
3. **Authentication › URL Configuration › Redirect URLs**: add `recscene://auth/callback` (packaged builds) and `http://127.0.0.1:51797/auth/callback` (development builds).
4. Apply the schema: `npx supabase@2 link --project-ref <project-ref>` then `npx supabase@2 db push` (or paste `migrations/*.sql` into the SQL editor).
5. Put the project URL and anon key in `.env` (see `.env.example`) and rebuild. Without them the Account tab says sign-in is not set up.

## Local stack
`npx supabase@2 start` runs the schema locally on ports 55321–55329 (so it can run beside Sparehour's stack). Google needs a client there too (`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET` in the shell); the migration and its policies can be checked without one, see `scripts/check-devices-rls.mjs`.
