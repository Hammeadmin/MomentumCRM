# MomentumCRM — Session Handoff Document

**Branch:** `claude/focused-wozniak-QGZs5`  
**Latest commit:** `8de720e`  
**Status:** All changes committed and pushed. Ready for PR review and merge into `main`.

---

## Stack & Key Facts

- React 18 + TypeScript + Supabase + Tailwind CSS
- Swedish UI — all labels must use `useTranslation()` from `src/locales/sv.ts`, never hardcoded strings
- **Two `updateLead` functions exist** — always import from `src/lib/leads.ts` (logs activity), never from `src/lib/database.ts`
- Invoice templates: `settings.template_type = 'invoice'`; always read design_options as `template?.design_options || template?.settings?.design_options || {}`
- Lead lifecycle: `new` → `qualified` (quote) → `won` (order); fire-and-forget: `updateLead(id, { status: 'won' }).catch(...)`
- TypeScript must stay clean — run `npx tsc --noEmit` after every change
- Git push always needs token: `git remote set-url origin https://<GITHUB_PAT>@github.com/Hammeadmin/MomentumCRM.git`

---

## Everything Done This Session

### 1. TemplateBuilder: Precise Block Insertion (`+` buttons between blocks)

**Files:** `src/components/settings/TemplateBuilder.tsx`, `src/components/settings/StructurePanel.tsx`

`handleAddBlock` now accepts an optional `afterBlockId?: string`. When provided, the new block is spliced in immediately after that block rather than appended at the end.

`StructurePanel` now renders a `+` insert button between every pair of blocks and above the first block. Clicking opens a compact block-type picker. Insertion calls `onAddBlock(type, afterBlockId)`.

```typescript
// Key change in handleAddBlock
if (afterBlockId) {
    const idx = blocks.findIndex(b => b.id === afterBlockId);
    newBlocks = idx !== -1
        ? [...blocks.slice(0, idx + 1), newBlock, ...blocks.slice(idx + 1)]
        : [...blocks, newBlock];
}
```

---

### 2. TemplateBuilder: Row/Column Side-by-Side Layout

**Files:** `src/lib/quoteTemplates.ts`, `src/components/settings/TemplateBuilder.tsx`, `src/components/settings/StructurePanel.tsx`, `src/components/QuotePreview.tsx`

**New `RowColumn` interface** exported from `src/lib/quoteTemplates.ts`:
```typescript
export interface RowColumn {
    id: string;
    width: '1/4' | '1/3' | '1/2' | '2/3' | '3/4' | '1/1';
    block: ContentBlock;
}
```

**New `row` block type** added to `BLOCK_REGISTRY`:
- `type: 'row'`, `label: 'Kolumnrad'`, `category: 'layout'`
- `defaultContent: { columns: [] }`, `defaultSettings: { gap: 16 }`

**`handleMoveBlockToRow(blockId, rowId)`** in TemplateBuilder: removes block from top-level array, adds it as a new `RowColumn` inside the target row's `content.columns`.

**`StructurePanel` `RowColumnEditor`**: shown when selected block is `row` type. Provides column width selectors, add/remove column buttons, gap slider, and a picker to move existing top-level blocks into the row.

**`QuotePreview`** renders `row` blocks as a flex container. `renderContentBlock` gained a `skipWrapper?: boolean` third param so column blocks don't get double-wrapped.

**Event bubbling fixes on dropdowns:** All picker dropdowns in StructurePanel use `onClick={(e) => e.stopPropagation()} onDragStart={(e) => e.stopPropagation()}`.

---

### 3. Fortnox: Complete Integration Overhaul

#### 3a. `supabase/functions/fortnox-api/index.ts` — Full Rewrite

Previous version had the wrong code entirely (sync logic calling itself). Rewritten with three actions:

| Action | What it does |
|---|---|
| `auth` | OAuth code exchange — stores `access_token`, `refresh_token`, `fortnox_token_expires_at` in `organisations` |
| `proxy` | Proxies Fortnox REST API calls. Auto-refreshes token if within 5 min of expiry |
| `refresh` | Force-refresh token (admin/debug) |

Uses `FORTNOX_CLIENT_ID` + `FORTNOX_CLIENT_SECRET` from `Deno.env`. Extracts `ErrorInformation.message` from Fortnox error responses for readable errors.

**Security**: `proxy` and `refresh` actions perform manual JWT verification — caller must supply a valid user JWT or the service role key. `auth` is intentionally open (OAuth code is single-use and short-lived):

```typescript
if (body.action === 'proxy' || body.action === 'refresh') {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    if (token !== supabaseServiceKey) {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return jsonError('Unauthorized', 401);
    }
}
```

#### 3b. `supabase/functions/sync-fortnox/index.ts`

- Fixed import: `npm:@supabase/supabase-js` → `jsr:@supabase/supabase-js@2`
- Added `HouseWorkCostProposal` to ROT/RUT invoice payload (was a TODO):
```typescript
houseWorkCostProposal = [{
    PersonNumber: fortnoxPersonnummer,
    ...(fastighetsbeteckning ? { RealEstateDesignation: fastighetsbeteckning } : {})
}];
// In Invoice body:
...(houseWorkCostProposal ? { HouseWorkCostProposal: houseWorkCostProposal } : {})
```

#### 3c. `supabase/config.toml`

```toml
[fortnox-api]
verify_jwt = false   # Needed for OAuth callback page (no session). Auth done manually inside fn.

# sync-fortnox and sync-from-fortnox: verify_jwt = true (default)
# Always called from authenticated app sessions.
```

#### 3d. Fortnox OAuth Popup

**`src/lib/fortnox.ts`** — new `connectFortnoxPopup(organisationId)`:
- Opens a centered 600×700 popup to the Fortnox auth URL
- Returns a `Promise` that resolves when the callback page posts `fortnox-oauth-result` message back
- Polls every 500ms for manual popup close (resolves with error if closed without completing)
- If browser blocks the popup, resolves with a Swedish error message

**`src/components/FortnoxCallback.tsx`** — popup-aware:
- Detects popup context via `!!window.opener && window.opener !== window`
- **Success**: `postMessage({ type: 'fortnox-oauth-result', success: true })` — opener calls `popup.close()`
- **Error**: delays `postMessage` by 2 seconds so user sees the error, then opener closes
- Falls back to full-page `navigate()` when not in a popup
- Detects Fortnox `?error=` redirect (e.g. `error_missing_license`) and shows readable Swedish message
- Logs only pathname and param key names — never param values (avoids CWE-532 OAuth code exposure)

**CRITICAL ROUTING RULE**: `/app/fortnox/callback` is registered as a **public route in `App.tsx`**, before the `ProtectedRoute` wrapper for `/app/*`. It must stay public — the popup has no Supabase session when Fortnox redirects back. Moving it back inside `ProtectedRoute` will break OAuth (auth guard strips the `?code=` params).

```tsx
// App.tsx — public routes (before the ProtectedRoute block)
<Route path="/app/fortnox/callback" element={<FortnoxCallback />} />
```

#### 3e. `src/lib/fortnox.ts` — Scope and test connection fixes

- OAuth scope reduced to `invoice customer` — `companyinformation` was removed because it requires a separate Fortnox license module and caused `error_missing_license`
- `testFortnoxConnection` changed from `GET /companyinformation` to `GET /customers?limit=1` (same reason — we don't have that scope)

#### 3f. `src/components/settings/IntegrationSettings.tsx` — FortnoxPanel

Added `FortnoxPanel` component (defined in the same file, before `IntegrationSettings`). Shows:
- Connection status badge (green/yellow/gray) + token expiry time
- Test connection button with result
- Sync stats grid: synced invoices, unsynced invoices, synced customers, unsynced customers
- "Skicka till Fortnox" (export) and "Hämta från Fortnox" (update payment status) buttons with spinners
- Sync result summary with per-error list
- Setup guide for first-time connect; expired token warning

`loadFortnoxStats()` runs 5 parallel Supabase `count` queries to populate the stats tiles.

Both the card-level "Anslut" button and the FortnoxPanel button use `connectFortnoxPopup`. On success, connection status and stats refresh in-place without leaving the settings page.

---

### 4. Fortnox Production Checklist (non-code)

These must be in place for the integration to work — they are not in the repo:

| What | Where to set it |
|---|---|
| `VITE_FORTNOX_CLIENT_ID` | Hosting env vars (Vercel/Netlify) — frontend uses this to build the OAuth URL |
| `FORTNOX_CLIENT_ID` | Supabase edge function secrets |
| `FORTNOX_CLIENT_SECRET` | Supabase edge function secrets |
| Deploy edge functions | `supabase functions deploy fortnox-api sync-fortnox sync-from-fortnox` |
| Fortnox account license | The authorizing Fortnox user needs API access for `invoice` and `customer` modules |
| Fortnox app scopes | The registered developer app must have `invoice` and `customer` scopes enabled |

---

## File Change Summary (This Session)

| File | What Changed |
|---|---|
| `src/lib/quoteTemplates.ts` | Added `RowColumn` interface export; added `row` block to `BLOCK_REGISTRY` |
| `src/components/settings/TemplateBuilder.tsx` | `handleAddBlock` positional insertion; `handleMoveBlockToRow`; row column management handlers |
| `src/components/settings/StructurePanel.tsx` | `+` insert buttons; `RowColumnEditor`; move-to-row picker with event bubbling fixes |
| `src/components/QuotePreview.tsx` | Added `row` block renderer; `skipWrapper` param on `renderContentBlock` |
| `supabase/functions/fortnox-api/index.ts` | Complete rewrite: `auth` / `proxy` / `refresh` actions; manual JWT auth for sensitive actions |
| `supabase/functions/sync-fortnox/index.ts` | Fixed jsr import; added `HouseWorkCostProposal` for ROT/RUT |
| `supabase/config.toml` | `verify_jwt = false` for `fortnox-api` only |
| `src/components/FortnoxCallback.tsx` | Popup-aware; handles Fortnox `?error=` responses; safe console logging |
| `src/lib/fortnox.ts` | Added `connectFortnoxPopup`; reduced OAuth scope; fixed `testFortnoxConnection` |
| `src/components/settings/IntegrationSettings.tsx` | Added `FortnoxPanel` component; `connectFortnoxPopup` in connect handlers; `loadFortnoxStats` |
| `src/App.tsx` | `/app/fortnox/callback` registered as public route before `ProtectedRoute` |
| `src/components/AppRoutes.tsx` | Removed duplicate `/fortnox/callback` route (now handled in App.tsx) |

---

## Architecture Decisions

### Why `verify_jwt = false` only for `fortnox-api`?
The OAuth callback page is a public route with no Supabase session. `supabase.functions.invoke` from an unauthenticated context sends no Authorization header, so the gateway would return 401 before our code even runs — explaining zero logs in Supabase. Sensitive actions (`proxy`, `refresh`) are protected by manual JWT verification inside the function instead.

### Why is the OAuth callback a public route?
Fortnox redirects the popup back to `/app/fortnox/callback?code=xxx&state=xxx`. If that route is behind `ProtectedRoute`, the auth guard intercepts the request, redirects to `/login`, and the query params are lost. The callback page doesn't need a session — the token exchange is server-side via the edge function (service role key).

### Why `invoice customer` scope only?
`companyinformation` triggered `error_missing_license` on accounts without that specific Fortnox API module. The two core scopes (`invoice`, `customer`) are sufficient for all sync operations.

### Why popup instead of redirect for OAuth?
The user stays on the settings page. After the popup closes, the connection status and sync stats refresh in-place. No page navigation, no lost state.

### `connectFortnoxPopup` server-to-server calls
When `sync-fortnox` or `sync-from-fortnox` invoke `fortnox-api` with `action: 'proxy'`, they use a Supabase client initialized with the service role key. `supabase.functions.invoke` automatically sends that key as the `Authorization: Bearer` header, which passes the manual auth check in `fortnox-api`.

---

## Known Issues / What's Left

### 1. Fortnox sync not yet end-to-end tested
The user has all secrets configured and edge functions deployed, but as of this session the Fortnox account had a licensing issue (`error_missing_license`). Once they obtain the Integration license from Fortnox, the code is ready to test. The OAuth popup flow gets past that point and the callback correctly identifies the license error with a readable message.

### 2. No new tests written
All changes were feature/integration work. The TypeScript is clean (`npx tsc --noEmit` passes with zero errors).

---

## How To Continue In A New Session

1. Active branch: `claude/focused-wozniak-QGZs5` — all changes pushed
2. TypeScript is clean: `npx tsc --noEmit` passes
3. Always set remote with token before pushing: `git remote set-url origin https://<GITHUB_PAT>@github.com/Hammeadmin/MomentumCRM.git`
4. To merge: open a PR on GitHub from `claude/focused-wozniak-QGZs5` → `main`

---

## Quick Reference: Key Patterns

```typescript
// Fire-and-forget lead status update
if (leadId) {
  updateLead(leadId, { status: 'won' }).catch(err =>
    console.error('Failed to mark lead as won:', err)
  );
}

// Template design options (always check both locations)
const { primary_color = '#2563eb' } =
  template?.design_options || template?.settings?.design_options || {};

// Translation hook (never hardcode Swedish strings)
const { t } = useTranslation();

// Fortnox popup connect pattern
const result = await connectFortnoxPopup(organisationId);
if (result.success) {
  // refresh status, load stats
} else if (result.error) {
  setError(result.error);
}
```
