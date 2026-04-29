# Codebase Concerns

**Analysis Date:** 2026-04-29

---

## Tech Debt

**Untyped `any` usage is pervasive (683 occurrences across 129 files):**
- Issue: `any` is used throughout the codebase — in component props, lib return types, and query results — suppressing TypeScript's type safety entirely.
- Files: `src/components/QuotePreview.tsx` (102 occurrences), `src/components/invoices/modals/CreateEditInvoiceModal.tsx`, `src/lib/activityService.ts`, `src/lib/search.ts`, `src/lib/rot.ts`
- Impact: Silences type errors at compile time that surface as runtime crashes. Makes refactoring hazardous.
- Fix approach: Replace with concrete interfaces or `unknown` with narrowing. Start with lib files that return data consumed by multiple components.

**`TODO` stubs for core functionality:**
- Issue: Three significant `TODO` comments mark unimplemented features that affect data correctness.
  - `src/lib/timeLogs.ts:449` — `const isSubmitted = false; // TODO: Implement timesheet submission tracking` — the `isSubmitted` flag is always `false`; timesheet submission state is non-functional.
  - `src/lib/quotes.ts:536` — `// TODO: Integrate with actual email service` — order confirmation emails are silently simulated (500ms `setTimeout`), no email is ever sent.
  - `src/lib/teams.ts:401` — `// TODO: Add availability checking based on calendar events` — `getAvailableTeams` returns all teams regardless of calendar conflicts.
  - `src/components/SMSComposer.tsx:149` — `from_number: '+46123456789' // TODO: Get from settings` — SMS sender number is hardcoded to a fake Swedish number.
- Impact: Broken UX promises (submitted timesheets look un-submitted), silent failures (order confirmation emails dropped), wrong sender ID on all outbound SMS.
- Fix approach: Wire timesheet submission to a `timesheet_submissions` table; connect `sendOrderConfirmationEmail` to the existing `send-email` Edge Function; read `from_number` from `system_settings`.

**Duplicate design_options schema in QuoteTemplate type:**
- Issue: `src/lib/quoteTemplates.ts` defines `design_options` both as a nested field inside `settings` and as a top-level field on the `QuoteTemplate` interface, creating ambiguity about which path is authoritative.
- Files: `src/lib/quoteTemplates.ts:14-36`
- Impact: Components reading `template.settings.design_options` and those reading `template.design_options` may diverge silently.
- Fix approach: Consolidate to one location (top-level preferred, matches DB column). Deprecate and migrate `settings.design_options` usages.

**`ordermanagement.tsx` vs `OrderKanban.tsx` overlap:**
- Issue: Both `src/components/ordermanagement.tsx` (889 lines) and `src/components/OrderKanban.tsx` (2297 lines) appear to manage orders. The lowercase filename `ordermanagement.tsx` violates the PascalCase convention used everywhere else and suggests an older duplicated module.
- Impact: Logic drift between the two files; unclear which is authoritative; increases bundle size.
- Fix approach: Audit both files for unique logic, merge into `OrderKanban.tsx`, delete the lowercase file.

**`src/components/invoices/modals/CreateEditInvoiceModal.tsx:78` and `InvoiceDetailsModal.tsx:41` — untyped `orderNotes`:**
```typescript
orderNotes: any[]; // TODO: type this
invoiceOrderNotes: any[]; // TODO: type this
```
- Fix approach: Extend the `OrderNote` type from `src/types/database.ts`.

---

## Known Bugs

**Order confirmation emails are silently dropped:**
- Symptoms: `sendOrderConfirmationEmail` in `src/lib/quotes.ts:526-551` logs the email to the console and resolves successfully with `{ success: true }` but never calls any Edge Function. The calling code cannot distinguish a real send from a simulation.
- Files: `src/lib/quotes.ts:536-544`
- Trigger: Any time a quote is converted to an order and a confirmation email would be expected.
- Workaround: None; emails simply do not send.

**Timesheet `isSubmitted` is hardcoded `false`:**
- Symptoms: Worker timesheet UI always shows timesheets as "not submitted" regardless of actual state.
- Files: `src/lib/timeLogs.ts:449`
- Trigger: Any call to `getWeeklyTimesheet`.
- Workaround: None.

**`increment_counter` RPC call in `submit-lead-form` silently fails:**
- Symptoms: `supabase.functions/submit-lead-form/index.ts:218` calls `supabase.rpc('increment_counter', undefined)` which does not exist, catches the error silently, then manually updates `submission_count` with a non-atomic read-modify-write. Under concurrent submissions the count can be under-counted.
- Files: `supabase/functions/submit-lead-form/index.ts:218-225`
- Trigger: Concurrent form submissions.
- Workaround: The fallback manual update fires but is not atomic. Replace with a proper Postgres `submission_count = submission_count + 1` RPC.

**Google Calendar sync silently skipped when `provider_token` is absent:**
- Symptoms: If a user's OAuth session does not carry a `provider_token` (e.g., after token refresh), meetings created via `CalendarView` are not synced to Google Calendar and no user-visible error is shown.
- Files: `src/components/CalendarView.tsx:1132`
- Trigger: Supabase session refresh discards `provider_token`; Google sync quietly stops working.

---

## Security Considerations

**`dangerouslySetInnerHTML` on unsanitized user content (XSS risk):**
- Risk: Two locations render user-supplied HTML directly without sanitization.
  - `src/components/IntranetFeedModal.tsx:153` — renders `selectedPost.content` (rich-text HTML written by an admin or author) directly.
  - `src/components/QuotePreview.tsx:122` — renders block `content` which originates from user-entered rich text.
- Current mitigation: None — no `DOMPurify` or equivalent HTML sanitization library is present anywhere in the codebase.
- Recommendations: Install `dompurify` (and `@types/dompurify`) and apply `DOMPurify.sanitize()` before passing to `dangerouslySetInnerHTML`. This is mandatory before allowing non-admin users to post intranet content.

**All Edge Functions use `Access-Control-Allow-Origin: '*'` (CORS wildcard):**
- Risk: All 16 Edge Functions accept cross-origin requests from any domain. Internal functions that require a Supabase auth Bearer token are partially protected, but public endpoints (`submit-lead-form`, `track-quote-view`) accept requests from arbitrary origins.
- Files: `supabase/functions/*/index.ts` — every function sets `'Access-Control-Allow-Origin': '*'`
- Current mitigation: Authenticated endpoints verify the Bearer token; public endpoints validate `form_id` existence.
- Recommendations: Restrict CORS to the known production domain for authenticated endpoints. For public endpoints (lead forms, quote tracking) keep wildcard but add rate limiting via Supabase Edge Function middleware or Cloudflare.

**`reminder_logs` RLS policy allows ALL operations with no restriction:**
- Risk: The policy `system_manage_reminder_logs` is `PERMISSIVE, ALL, using=true, check=true` — any authenticated user can read, write, update, and delete any organisation's reminder logs.
- Files: `Supabase RLS policies in public schema.csv:142`
- Current mitigation: None.
- Recommendations: Restrict SELECT to `organisation_id = get_my_org()` and INSERT/UPDATE/DELETE to service role only (or `get_my_role() = 'admin'`). Mirror the pattern used by `webhook_logs`.

**`lead_activities` INSERT policy allows any authenticated user to insert with `check=true`:**
- Risk: The check expression for `system_insert_lead_activities` is `true`, meaning any authenticated user from any organisation can insert into `lead_activities` targeting any `lead_id`.
- Files: `Supabase RLS policies in public schema.csv:74`
- Current mitigation: SELECT is properly restricted to own organisation's leads.
- Recommendations: Tighten the INSERT check to `lead_id IN (SELECT id FROM leads WHERE organisation_id = get_my_org())`.

**Fortnox OAuth tokens stored in plain `organisations` table columns:**
- Risk: `fortnox_access_token`, `fortnox_refresh_token`, and `fortnox_client_secret` are stored as plain text columns in the `organisations` table (`src/types/database.ts:130-133`). These columns are readable by all authenticated users in the same organisation via the `users_view_own_org` SELECT policy.
- Files: `src/types/database.ts:130-133`, `Supabase RLS policies in public schema.csv:122`
- Current mitigation: The SELECT policy restricts to own organisation. Workers cannot read other organisations' tokens.
- Recommendations: Move sensitive OAuth tokens to a separate `organisation_secrets` table accessible only to admin/service role, or use Supabase Vault.

**SMS API password stored in system_settings (user-readable):**
- Risk: `sms_api_password` is stored in `system_settings` (`src/types/database.ts:138`). The `users_view_settings` RLS policy grants SELECT to all org members — including `worker` role — exposing the SMS provider credential.
- Files: `src/types/database.ts:138`, `Supabase RLS policies in public schema.csv:151`
- Recommendations: Move SMS credentials to a restricted table or use Supabase Vault. At minimum, restrict `system_settings` SELECT to `admin` and `finance` roles.

**Hardcoded fake phone number used as SMS sender:**
- Risk: `src/components/SMSComposer.tsx:149` hardcodes `from_number: '+46123456789'` — a non-existent number. SMS sent with an unregistered sender ID will be rejected or spoofed.
- Files: `src/components/SMSComposer.tsx:149`
- Fix approach: Read `from_number` from `system_settings.sms_sender_id` (or equivalent column).

---

## Performance Bottlenecks

**Global search executes up to 10 parallel Supabase queries per keypress:**
- Problem: `src/lib/search.ts` runs a "starts-with" query followed by a "contains" fallback for each entity type (customers, orders, quotes, invoices, leads, events). With a 300ms debounce, rapid typing still issues up to 10 network requests per search interaction.
- Files: `src/lib/search.ts`
- Cause: No server-side full-text search (PostgreSQL `tsvector`) is in use; all matching is done via `ilike`.
- Improvement path: Implement a Postgres full-text search RPC (already partially available in migrations) and call a single `search_all(query, org_id)` function. Alternatively, add `pg_trgm` indexes on `name` / `title` columns.

**`select('*')` on 60 call sites — over-fetching:**
- Problem: 60 occurrences of `.select('*')` across 19 lib files fetch all columns including large JSON blobs (`form_data`, `template_snapshot`, `content_structure`) on every load.
- Files: `src/lib/database.ts` (16 occurrences), `src/lib/leads.ts` (10), `src/lib/payroll.ts` (5), `src/lib/teams.ts` (5), others
- Cause: Convenience / speed-of-development approach.
- Improvement path: Replace with explicit column lists on high-traffic queries (especially `leads`, `orders`, `quotes` list views). Use column selection in `database.ts` list functions.

**`CalendarView.tsx` is 3026 lines — single-file component:**
- Problem: The largest component in the codebase (`src/components/CalendarView.tsx`, 3026 lines) loads entirely on every calendar route visit. It contains month, week, day, and list views, event forms, Google Calendar sync, and order/job rendering logic all in one file.
- Impact: Large parse/compile cost on initial render; no code splitting within the calendar feature.
- Improvement path: Split into sub-components by view type (`MonthView`, `WeekView`, `DayView`, `EventForm`). Use React `lazy()` for secondary views.

**`TeamManagement.tsx` (2741 lines) and `database.ts` (2674 lines) are monolithic:**
- Files: `src/components/TeamManagement.tsx`, `src/lib/database.ts`
- Problem: `database.ts` contains every data-access function for every domain in a single file. Any import of any function loads the entire module.
- Improvement path: Split `database.ts` by domain (already partially done — `src/lib/leads.ts`, `src/lib/orders.ts` etc. exist but `database.ts` still contains ~2674 lines of residual functions). Migrate remaining functions to domain modules.

---

## Fragile Areas

**Quote acceptance flow — public token-based update:**
- Files: `src/pages/QuoteAcceptance.tsx`, `Supabase RLS policies in public schema.csv:137-138`
- Why fragile: The `public_accept_quotes_with_token` RLS policy allows unauthenticated updates to `quotes` where `status = 'sent'` and the token has not expired. The `token_expires_at` check is the sole expiry guard. If a token is leaked (e.g., forwarded email), the quote can be accepted by anyone holding it. There is no IP or device binding.
- Safe modification: Do not change the RLS policy without also updating `src/lib/quotes.ts` token generation. Token expiry is set at quote-send time.
- Test coverage: Zero automated tests exist anywhere in the codebase.

**Fortnox token refresh is not handled client-side:**
- Files: `src/lib/fortnox.ts:102-119`
- Why fragile: `getFortnoxConnectionStatus` checks `token_expires_at` but there is no automatic refresh flow in the client. If the token expires mid-session, all Fortnox sync calls will silently fail until an admin manually reconnects via the OAuth flow in Integration Settings.
- Safe modification: Add a `refreshFortnoxToken` call path in the `fortnox-api` Edge Function and invoke it when a 401 is returned.

**`InvoicePreview.tsx` replaces `document.body.innerHTML` for printing:**
- Files: `src/components/InvoicePreview.tsx:50-104`
- Why fragile: The print function saves `document.body.innerHTML`, replaces the entire body with invoice HTML, calls `window.print()`, then restores the original body. React's reconciliation does not know about this DOM mutation. If the print call throws or the user cancels, the DOM may not be restored correctly.
- Safe modification: Use a hidden `<iframe>` or a dedicated print stylesheet (`@media print`) instead of replacing `document.body`.

**No error boundary wrapping for most heavy components:**
- Files: `src/App.tsx`, `src/components/AppRoutes.tsx`
- Why fragile: `ErrorBoundary` and `RouteErrorBoundary` exist in `src/components/ErrorBoundary.tsx` but `App.tsx` does not wrap individual routes with `RouteErrorBoundary`. A JS error in `CalendarView`, `TeamManagement`, or `PayrollDashboard` will propagate to the root error boundary and blank the entire application.
- Safe modification: Wrap each route component in `AppRoutes.tsx` with `<RouteErrorBoundary>`.

---

## Scaling Limits

**Realtime subscriptions — one Supabase channel per table, per user session:**
- Current capacity: `src/components/RealtimeManager.tsx` opens 8 simultaneous realtime channels (one per table: orders, leads, quotes, invoices, jobs, notifications, customers, calendar_events).
- Limit: Supabase free/pro plans cap concurrent realtime connections. At ~200 simultaneous users, 1600 open channels may approach plan limits.
- Scaling path: Multiplex table subscriptions into a single channel with multiple filters, or implement server-sent events via an Edge Function aggregator.

**`PayrollDashboard` fetches all employees and all time logs for period:**
- Files: `src/components/PayrollDashboard.tsx`, `src/lib/payroll.ts`
- Limit: With 100+ employees, a full payroll period query fetches all time_log rows for the period across all users before aggregating in JS.
- Scaling path: Move payroll aggregation to a Postgres RPC (a draft `20260121_dashboard_payroll_rpc.sql` migration exists — ensure it's fully applied and used).

---

## Dependencies at Risk

**`mathjs` used for formula evaluation in `LeadManagement` and `quotes`:**
- Risk: `mathjs` is a large library (~500KB minified) imported in `src/components/LeadManagement.tsx:24` and `src/lib/quotes.ts` solely for `evaluate()`. The library parses user-supplied formula strings.
- Impact: Bundle size; if `evaluate` is ever called with unvalidated user input, it could be a vector (though `mathjs` sandboxes by default, scope injection still possible).
- Migration plan: Replace with a small purpose-built formula evaluator or validate/whitelist formula tokens before passing to `evaluate`.

**`@supabase/supabase-js@2.39.3` pinned in `submit-lead-form` Edge Function:**
- Risk: `supabase/functions/submit-lead-form/index.ts:19` pins `npm:@supabase/supabase-js@2.39.3` while other Edge Functions use `jsr:@supabase/supabase-js@2` (latest patch). Mixed version pinning can cause behavior differences.
- Migration plan: Standardise all Edge Functions to `jsr:@supabase/supabase-js@2`.

---

## Missing Critical Features

**No automated tests — zero coverage:**
- Problem: No test files (`.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx`) exist anywhere in `src/`. There is no test runner configuration (`jest.config.*`, `vitest.config.*`).
- Blocks: Safe refactoring of financial calculations (`src/lib/payroll.ts`, `src/lib/rot.ts`, `src/lib/rut.ts`), quote acceptance flow, and Fortnox sync are impossible to validate without running the full app manually.
- Priority: High — financial domain logic (ROT/RUT deduction calculations, payroll, invoice totals) is especially risky without unit tests.

**Timesheet submission/approval workflow is a stub:**
- Problem: `src/lib/timeLogs.ts:449` hardcodes `isSubmitted = false`. The UI surface (`WorkerTimesheet`) has submit/approve buttons but the state is never persisted.
- Blocks: Payroll approval process cannot close a period reliably; payroll admins cannot distinguish reviewed from unreviewed time entries.

**No audit log for financial mutations:**
- Problem: There is no append-only audit trail for invoice creation, deletion, or amount edits. The `invoice_history` table was added in migration `20260126194045_add_invoice_history_tracking.sql` but no code in `src/lib/invoices.ts` writes to it on mutations.
- Blocks: Financial compliance, dispute resolution.

---

## Test Coverage Gaps

**Financial calculation functions — completely untested:**
- What's not tested: ROT deduction logic (`src/lib/rot.ts`), RUT deduction logic (`src/lib/rut.ts`), payroll aggregation (`src/lib/payroll.ts`), invoice total calculation (`src/lib/invoices.ts`).
- Risk: Silent regressions in tax deduction amounts (ROT/RUT are Swedish tax authority filings), payroll amounts, or invoice totals that users won't notice until comparing with Fortnox or Skatteverket output.
- Priority: High

**Quote acceptance token flow — completely untested:**
- What's not tested: Token generation, expiry check, state machine transition (`sent` → `accepted`), public RLS policy enforcement.
- Files: `src/pages/QuoteAcceptance.tsx`, `src/lib/quotes.ts`
- Risk: Regressions could allow double-acceptance, expired-token acceptance, or broken signature capture.
- Priority: High

**Fortnox sync — no integration tests:**
- What's not tested: Customer sync, invoice sync, token refresh, error handling for Fortnox API 4xx/5xx responses.
- Files: `src/lib/fortnox.ts`, `supabase/functions/fortnox-api/index.ts`, `supabase/functions/sync-fortnox/index.ts`
- Risk: Silent data corruption in accounting records.
- Priority: High

**Public lead form endpoint — no contract tests:**
- What's not tested: Duplicate email deduplication, field extraction aliases, submission_count increment, webhook log insertion.
- Files: `supabase/functions/submit-lead-form/index.ts`
- Risk: Duplicate customer creation on concurrent submissions; lost lead data.
- Priority: Medium

---

## Placeholder / Incomplete Content

**Legal/company content contains placeholder data:**
- Issue: `src/locales/publicContent.ts` contains `org.nr 559XXX-XXXX` (three occurrences), `Birger Jarlsgatan 57, 113 56 Stockholm`, and phone `+46 8 123 45 67` throughout the public-facing privacy policy, terms of service, and contact page. These are placeholder values, not real registered company data.
- Files: `src/locales/publicContent.ts:423, 437, 487, 539`
- Impact: Legal documents shown to prospective customers reference a non-existent org number, which could create liability if the product is live.
- Fix approach: Replace with actual registered Swedish company details before any public launch.

---

*Concerns audit: 2026-04-29*
