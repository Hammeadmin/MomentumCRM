# External Integrations

**Analysis Date:** 2026-04-29

## APIs & External Services

**Accounting:**
- Fortnox (Swedish accounting SaaS) — bidirectional sync of customers and invoices
  - SDK/Client: Direct REST calls via `supabase/functions/fortnox-api/` proxy
  - Auth: OAuth 2.0 (authorization code flow); tokens stored per-organisation in `organisations` table (`fortnox_access_token`, `fortnox_refresh_token`, `fortnox_token_expires_at`)
  - Client-side OAuth init: `src/lib/fortnox.ts` → `getFortnoxAuthUrl()` uses `VITE_FORTNOX_CLIENT_ID`
  - Edge Functions: `supabase/functions/fortnox-api/` (OAuth exchange + API proxy), `supabase/functions/sync-fortnox/` (push CRM → Fortnox), `supabase/functions/sync-from-fortnox/` (pull status Fortnox → CRM)
  - Scopes requested: `invoice customer companyinformation`
  - API base: `https://api.fortnox.se/3`

**Calendar:**
- Google Calendar — sync CRM calendar events with optional Google Meet link generation
  - SDK/Client: Google Calendar REST API v3 (direct fetch in Edge Function)
  - Auth: OAuth provider token passed at call-time (Supabase Google OAuth session token)
  - Edge Function: `supabase/functions/sync-google-calendar/`
  - Actions: create / update / delete events; auto-generates Meet links via `conferenceData`

**Maps:**
- Google Maps Embed API — customer address map display
  - Client: Browser `<iframe>` embed; no SDK
  - Auth: `VITE_GOOGLE_MAPS_API_KEY` (frontend env var)
  - Implementation: `src/components/LocationMap.tsx`

**SMS:**
- 46elks — outbound SMS messaging (BYOK model per organisation)
  - API URL: `https://api.46elks.com/a1/sms`
  - Auth: Organisation-specific API username/password stored in `organisations` table (`sms_api_username`, `sms_api_password`)
  - Edge Function: `supabase/functions/send-sms/`
  - Client-side library: `src/lib/sms.ts`
  - Phone number handling: Swedish E.164 format conversion built-in

## Data Storage

**Databases:**
- Supabase PostgreSQL — primary data store for all CRM entities
  - Connection: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (frontend); `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (Edge Functions)
  - Client: `@supabase/supabase-js` 2.x — singleton at `src/lib/supabase.ts`
  - Row Level Security (RLS): Enforced; policies in migrations under `supabase/migrations/`
  - Migrations: 50+ SQL migration files in `supabase/migrations/`
  - Key tables include: `organisations`, `user_profiles`, `customers`, `leads`, `orders`, `invoices`, `invoice_line_items`, `quotes`, `calendar_events`, `communications`, `notifications`, `webhooks`, `webhook_logs`, `intranet_posts`, `lead_forms`, `message_templates`, `user_smtp_settings`
  - Dashboard views: `src/supabase/migrations/20251222_create_dashboard_views.sql`
  - RPC functions used for payroll and dashboard aggregation (see `20260121_dashboard_payroll_rpc.sql`)

**File Storage:**
- Supabase Storage — file and image uploads
  - Client: `@supabase/supabase-js` storage API
  - Implementation: `src/lib/storage.ts`
  - Image compression: Client-side canvas resize to max 1920px / 0.8 quality before upload
  - Storage RLS policies: `supabase/migrations/20250826123925_add_storage_rls_policies.sql`

**Caching:**
- TanStack React Query 5.x — in-memory client-side cache for all Supabase query results
- No server-side cache layer

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
  - Methods: Email/password, Google OAuth (with `signInWithGoogle`), password reset
  - Session management: JWT via Supabase client; `onAuthStateChange` listener in `src/contexts/AuthContext.tsx`
  - User profiles: Extended in `user_profiles` table joined by `auth.users.id`
  - Roles: `admin` | `sales` | `worker` | `finance` — stored in `user_profiles.role`
  - Multi-tenancy: `organisation_id` on all entities; all RLS policies scope by organisation
  - Google OAuth: Provider token reused for Google Calendar API calls
  - User creation helper: `supabase/functions/create-user/` — admin-only Edge Function to create users server-side

**Email Verification:**
- Supabase built-in email verification flow; sign-up returns `needsEmailVerification` flag

## Email Delivery

**Primary (BYOE — Bring Your Own Email):**
- User-configured custom SMTP — settings stored in `user_smtp_settings` table
  - Fields: `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`
  - Used via `nodemailer` in `supabase/functions/send-email/`

**System Fallback:**
- Resend (transactional email SaaS) — fallback when no SMTP configured
  - Auth: `RESEND_API_KEY` (Edge Function env var)
  - SMTP relay used: `smtp.resend.com:465` via nodemailer
  - Used in: `send-email`, `send-reminders`, `send-quote-email`, `intranet-weekly-summary`

**Email Edge Functions:**
- `supabase/functions/send-email/` — general outbound email with CC/BCC/attachments
- `supabase/functions/send-quote-email/` — quote-specific emails with tracking
- `supabase/functions/send-reminders/` — automated quote follow-ups and invoice payment reminders (3/7/14 day cadence)
- `supabase/functions/intranet-weekly-summary/` — weekly digest of intranet posts via Resend SDK

## Monitoring & Observability

**Error Tracking:**
- Not detected — no Sentry, Datadog, or similar SDK present

**Logs:**
- `console.log` / `console.error` / `console.info` throughout client code and Edge Functions
- Webhook delivery results logged to `webhook_logs` table via `supabase/functions/dispatch-webhook/`
- Communication send status tracked in `communications` table (`status`, `sent_at`, `delivered_at`, `error_message`)
- Fortnox sync results tracked in `invoices` table (`fortnox_synced_at`, `fortnox_invoice_number`)
- Reminder send history logged to prevent duplicate sends

## CI/CD & Deployment

**Hosting:**
- Frontend: Static site (Vite build output) — deployment target not specified in repo config
- Backend: Supabase cloud platform (managed PostgreSQL + Auth + Edge Functions on Deno)

**CI Pipeline:**
- Not detected — no GitHub Actions, CircleCI, or similar config found

## Webhooks & Callbacks

**Outgoing (CRM → external):**
- Configurable per-organisation webhooks dispatched on CRM events
- Dispatcher: `supabase/functions/dispatch-webhook/`
- Library: `src/lib/webhooks.ts`
- Supported events: `lead.created`, `lead.status_changed`, `quote.created`, `quote.accepted`, `order.created`, `order.status_changed`, `invoice.created` (and more)
- Security: Optional HMAC-SHA256 signature on payload via `X-Webhook-Signature` header
- Retry: Single retry on HTTP failure; all results logged to `webhook_logs` table
- Intended targets: Zapier, Make (Integromat), Slack, or any HTTP endpoint

**Incoming (external → CRM):**
- Lead form submissions — public endpoint `supabase/functions/submit-lead-form/`
  - No auth required; validates against active `lead_forms` config
  - Creates customer + lead records on submission
  - Swedish + English field alias mapping built-in
- Fortnox OAuth callback — handled client-side at `src/lib/fortnox.ts` → `exchangeFortnoxCode()`
- Quote view tracking — `supabase/functions/track-quote-view/` (public endpoint)
- Quote acceptance — `supabase/functions/notify-quote-event/` handles accepted/rejected events

## Environment Configuration

**Required frontend env vars (.env file, Vite prefix VITE_):**
- `VITE_SUPABASE_URL` — Supabase project URL (app will throw on startup if missing)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (app will throw on startup if missing)
- `VITE_FORTNOX_CLIENT_ID` — Required only if Fortnox integration is used
- `VITE_GOOGLE_MAPS_API_KEY` — Required only if map embeds are used

**Required Edge Function env vars (Supabase dashboard secrets):**
- `SUPABASE_URL` — Auto-provided by platform
- `SUPABASE_SERVICE_ROLE_KEY` — Auto-provided by platform
- `RESEND_API_KEY` — Required for system email fallback
- `FORTNOX_CLIENT_ID` — Required for Fortnox OAuth token exchange
- `FORTNOX_CLIENT_SECRET` — Required for Fortnox OAuth token exchange

**Secrets location:**
- Frontend: `.env` file (not committed; VITE_ prefixed vars exposed to browser bundle)
- Edge Functions: Supabase project secrets (set via Supabase CLI or dashboard)
- Per-organisation credentials (SMS keys, SMTP passwords) stored encrypted in `organisations` and `user_smtp_settings` tables under RLS

---

*Integration audit: 2026-04-29*
