# MomentumCRM — Session Handoff Document

**Branch:** `claude/sad-darwin-731708`  
**Latest commit:** `35935cd`  
**Status:** All changes committed and pushed. Ready for PR review and merge into `main`.  
**Worktree path:** `C:\Users\Elhar\Desktop\MomentumCRM\MomentumCRM\.claude\worktrees\sad-darwin-731708`  
**Main repo path:** `C:\Users\Elhar\Desktop\MomentumCRM\MomentumCRM`

---

## Stack & Key Facts

- React 18 + TypeScript + Supabase + Tailwind CSS
- Swedish UI (all labels in Swedish)
- **Two `updateLead` functions exist** — always import from `src/lib/leads.ts` (logs activity, accepts `actingUserId`), never from `src/lib/database.ts` (no logging)
- Translation strings live in `src/locales/sv.ts` — access via `useTranslation()` hook. Never hardcode Swedish strings in components.
- Invoice templates are stored in the `quote_templates` table with `settings.template_type = 'invoice'`
- Quote templates have `settings.template_type = 'quote'` (default when creating a new template)

---

## Everything Done Across Both Sessions (25 commits)

### Phase 1 — Order Modal Foundations
**Commits:** `274c6ea`, `34c3c42`, `e107890`
- `CreateOrderModal` completely rewritten: tabbed layout (Grundinfo / Kund & Uppdrag / Orderrader / Avdrag)
- `lead_id` field added to orders flow — orders can be linked to a lead
- Lead picker added to `CreateOrderModal` with autofill (selecting a lead fills title, description, customer, source, region)
- Product library wired up correctly in `CreateOrderModal`
- Line items section added using `LineItemsEditor`

### Phase 2 — Tab-Aware Validation
**Commit:** `cf4425c`
- Native HTML `required` attributes never fire on fields in hidden tabs
- Fix: all tabbed modals now do explicit manual validation before submit, auto-switch to the failing tab, and show a toast error

### Phase 3 — LineItemsEditor Unification
**Commit:** `b30d62b`
- `unit` field added to `LineItemsEditor.LineItem` type and propagated to all 6 modals + 3 library files
- All order/invoice modals now use the shared `LineItemsEditor` component

### Phase 4 — Lead/Quote/Order Pipeline Fix
**Commit:** `97928d7`

| Problem | Fix |
|---|---|
| Phantom Kanban quote cards | `createOrderWithQuote` now repurposes existing draft quote or creates new with `status: 'accepted'` — never `draft` |
| `updateOrderAndQuote` created draft backing quotes | Changed to always use `status: 'accepted'` |
| `acceptQuoteAndCreateOrder` never marked lead as won | Added `updateLead(lead_id, { status: 'won' })` after order creation |
| `CreateOrderModal` never marked lead as won | Added fire-and-forget `updateLead` call after success |
| `Ordermanagement.handleSaveOrder` never marked lead as won | Added `updateLead` import + call in create branch |
| `CalendarView` was marking lead as `won` at quote creation | Fixed to `qualified` — correct: quote = qualified, order = won |

**Lead lifecycle (correct):** `new` → `qualified` (quote created) → `won` (order created or quote accepted)

**Fire-and-forget pattern used throughout:**
```typescript
if (someLeadId) {
  updateLead(someLeadId, { status: 'won' }).catch(err =>
    console.error('Failed to mark lead as won:', err)
  );
}
```

### OrderKanban Fixes
**Commit:** `6420d1d`

| Problem | Fix |
|---|---|
| Activity log showed no user name (user_id was null) | Every `createOrderActivity` call now calls `supabase.auth.getUser()` to resolve the real auth user |
| Edit modal inside OrderDetailModal showed old 550-line inline form | Removed inline form, now opens shared `OrderEditModal` from `ordermanagement.tsx` as overlay |

### Kanban Card Title Truncation Fix
**Commit:** `7eaa0b2`
- `truncate` CSS class forced single-line cutoff on all three card types
- Fixed: changed to `break-words min-w-0` so full titles display

### Invoice Header Alignment Fix
**Commit:** `29ca759`
- Company phone/email in invoice header had `justify-center` on flex divs → visually misaligned vs address lines
- Fixed: removed `justify-center`, plain `<p>` tags

### Invoice Icons Removed + Customer Org.nr Added
**Commit:** `4546605`
- Removed `Mail`, `Phone`, `MapPin` icon imports from `InvoicePreview.tsx` (looked unprofessional)
- Customer org.nr now shown in invoice preview: `Org.nr: {invoice.customer.org_number}`
- Customer email/phone shown as plain text (no icons)

### Invoice Template Selection Feature
**Commits:** `8ee3596`, `9dc199c`, `f4f9b45`

**What was built:**
1. **`InvoiceDetailsModal.tsx`** — template picker moved out of the customer info card into its own clearly labelled "Designmall" card. Shows hint + link to Settings when no invoice templates exist. `onSend` callback now carries the selected template as a second argument.
2. **`EmailInvoiceModal.tsx`** — added `template?: QuoteTemplate` prop. Passed to both `InvoicePreview` instances (live preview AND the hidden off-screen PDF render target used to generate the attachment).
3. **`InvoiceManagement.tsx`** — added `emailTemplate` state. Captured from `onSend` callback, forwarded to `EmailInvoiceModal`, cleared on close.
4. **`src/lib/invoices.ts`** — added `org_number` to customer relation in both `getInvoices` and `getInvoice` select statements (was missing, so org_nr was always undefined in preview).
5. **`src/locales/sv.ts`** — added `INVOICES.DETAILS` section with 4 translation keys for the template picker UI.
6. **`src/components/InvoicePreview.tsx`** — full template-driven rendering fixed (see below).

**Three root-cause bugs fixed in `InvoicePreview.tsx` (commit `f4f9b45`):**

| Bug | Fix |
|---|---|
| `design_options` read from wrong path (`template?.design_options`) | Now checks both: `template?.design_options \|\| template?.settings?.design_options` |
| 16 invoice block types all returned `null` from `renderContentBlock` | Added renderers for: `header_row`, `invoice_header`, `customer_info`, `customer_details`, `totals`, `subtotal`, `vat_info`, `total`, `rot_rut_info`, `payment_info`, `bank_details`, `page_footer`, `terms`, `custom_text_block`, `f_skatt_text`, `divider`, `spacer` |
| Hardcoded static sections always rendered, conflicting with template blocks | Wrapped static header/customer/totals/footer in `{!template && (...)}` — template mode drives the full layout, default mode keeps the old static layout |

---

## File Change Summary (All Sessions)

| File | What Changed |
|---|---|
| `src/components/CreateOrderModal.tsx` | Full rewrite: tabbed layout, lead picker, LineItemsEditor, manual validation, updateLead on success |
| `src/components/OrderDetailModal.tsx` | Removed 550-line inline form; now uses shared OrderEditModal |
| `src/components/ordermanagement.tsx` | Export OrderEditModal; add updateLead import + call in handleSaveOrder |
| `src/components/CalendarView.tsx` | Fix: `won` → `qualified` at quote-creation stage |
| `src/components/LineItemsEditor.tsx` | Added `unit` field to LineItem type |
| `src/components/QuoteEditModal.tsx` | LineItemsEditor integration + manual validation |
| `src/components/InvoiceEditModal.tsx` | LineItemsEditor integration |
| `src/components/OrderKanban.tsx` | Card titles: `truncate` → `break-words min-w-0` |
| `src/components/InvoicePreview.tsx` | Removed icons; added org_nr; fixed alignment; full template-driven rendering with 16+ block renderers |
| `src/components/InvoiceManagement.tsx` | Added `QuoteTemplate` import, `emailTemplate` state, threaded to EmailInvoiceModal |
| `src/components/invoices/modals/InvoiceDetailsModal.tsx` | Template picker own section; onSend passes template; useTranslation for i18n |
| `src/components/invoices/modals/EmailInvoiceModal.tsx` | Added `template` prop; passes to both InvoicePreview instances |
| `src/lib/orders.ts` | createOrderWithQuote: repurpose existing draft quote, always accepted status; updateOrder: auth user in activities |
| `src/lib/quotes.ts` | acceptQuoteAndCreateOrder: mark lead as won |
| `src/lib/invoices.ts` | Added `org_number` to customer relation in getInvoices + getInvoice select queries |
| `src/locales/sv.ts` | Added `INVOICES.DETAILS` section (template picker i18n strings) |
| `src/lib/quoteTemplates.ts` | Added distinct `design_options` to all 3 default invoice templates (color + logo position) |
| `src/components/settings/TemplateBuilder.tsx` | Template dropdown uses `<optgroup>` by type; colored type badge (toggle) added to header |

---

## Architecture Decisions

### Why fire-and-forget for lead status updates?
Lead status updates (`won`) are triggered after the primary operation (order creation) succeeds. Using `.catch()` means a failure to update the lead never rolls back or blocks the order. The order is the source of truth; lead status is derived.

### Why `src/lib/leads.ts` and not `src/lib/database.ts` for `updateLead`?
`leads.ts` version logs an activity entry (audit trail) and accepts `actingUserId`. `database.ts` version has no logging. **Always use `src/lib/leads.ts`.**

### Why `status: 'accepted'` for backing quotes?
Backing quotes (auto-created when an order is created directly) are internal records, never shown to the customer. `draft` status makes them appear in the Kanban quotes column as phantom cards. `accepted` is semantically correct and keeps them invisible.

### Why `{!template && (...)}` in InvoicePreview?
When a template is selected, the template's `content_structure` blocks are meant to drive the entire layout (header, customer info, line items, totals, footer). If the hardcoded static sections also rendered, they would duplicate or conflict with the template blocks. The static sections step aside completely when a template is active.

### Why `template?.design_options || template?.settings?.design_options`?
The `QuoteTemplate` type defines `design_options` at both the top level and nested inside `settings`. Templates created through the TemplateBuilder historically store them in `settings.design_options`. The component now checks both locations so it works regardless of where the data landed.

---

## Known Issues / What's Left To Do

### ~~1. Invoice templates lack visual differentiation out of the box~~ ✅ FIXED (commit `35935cd`)
Default invoice templates now ship with distinct `design_options` inside `settings`:
- **Professionell Faktura**: navy `#1e40af`, logo right
- **Enkel Faktura**: teal `#0f766e`, logo left
- **ROT/RUT Faktura**: amber `#92400e`, logo left, amber-tinted ROT block

Users switching between templates will see immediate visual differences in color scheme and logo placement without any extra configuration.

### ~~2. TemplateBuilder — invoice vs quote filter~~ ✅ FIXED (commit `35935cd`)
The template selector dropdown now groups templates with `<optgroup>` labels ("📋 Fakturor" / "📄 Offerter"). A colored pill badge appears next to the selector showing the currently active template type ("💰 Faktura" in green, "📄 Offert" in blue). The badge doubles as a click-to-toggle button so type can be changed without digging into the sidebar.

### 3. No new tests were written
All fixes were surgical changes to existing logic. The test suite (if any) has not been expanded to cover the new behaviour.

### 4. Branch is ahead of main
Branch `claude/sad-darwin-731708` is ahead of `main` and ready for a PR. The merge conflict with main's `InvoicePreview.tsx` edit was already resolved in commit `b3105db`.

### 5. `supabase.auth.getUser()` pattern in orders.ts
The auth user resolution in `createOrderActivity` calls uses `supabase.auth.getUser()` which requires an authenticated browser context. This is fine for the current client-side React architecture but would break in any future server-side or edge function context.

---

## How To Continue In A New Session

1. Open the worktree: `C:\Users\Elhar\Desktop\MomentumCRM\MomentumCRM\.claude\worktrees\sad-darwin-731708`
   - Or the main repo: `C:\Users\Elhar\Desktop\MomentumCRM\MomentumCRM`
2. The active branch is `claude/sad-darwin-731708`, all changes are pushed
3. To merge into main: open a PR on GitHub from `claude/sad-darwin-731708` → `main`
4. TypeScript is clean: `npx tsc --noEmit` runs with zero errors
5. Next logical tasks are in the "Known Issues" section above

---

## Quick Reference: Key Patterns Used

```typescript
// Fire-and-forget lead status update (never blocks primary operation)
if (leadId) {
  updateLead(leadId, { status: 'won' }).catch(err =>
    console.error('Failed to mark lead as won:', err)
  );
}

// Auth user in activity logging
const { data: { user: authUser } } = await supabase.auth.getUser();
await createOrderActivity(orderId, authUser?.id || null, 'event_type', 'description');

// Template design options (check both locations)
const { primary_color = '#2563eb', font_family = 'Inter' } =
  template?.design_options || template?.settings?.design_options || {};

// Translation hook (never hardcode Swedish strings)
const { invoices: t } = useTranslation();
// then: t.DETAILS.TEMPLATE_LABEL, t.MESSAGES.CREATED, etc.
```
