<!-- refreshed: 2026-04-29 -->
# Architecture

**Analysis Date:** 2026-04-29

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        Browser Entry Point                               │
│  `src/main.tsx`  — QueryClientProvider (React Query) wraps everything   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         App.tsx — Root Router                            │
│  AuthProvider → OfflineIndicator → BrowserRouter → NotificationProvider │
│  → GlobalActionProvider → RealtimeManager → <Routes>                    │
└────────────┬──────────────────┬──────────────────┬───────────────────── ┘
             │                  │                  │
             ▼                  ▼                  ▼
  ┌──────────────────┐ ┌─────────────────┐ ┌──────────────────────┐
  │  Public Website  │ │   Auth Routes   │ │  Protected App (/app)│
  │  PublicLayout    │ │  /login         │ │  ProtectedRoute →    │
  │  `src/layouts/   │ │  /register      │ │  AppRoutes           │
  │   public/`       │ │  /reset-password│ │  `src/components/    │
  │  `src/pages/     │ └─────────────────┘ │   AppRoutes.tsx`     │
  │   public/`       │                     └──────────┬───────────┘
  └──────────────────┘                                │
                                        Role-based layout split
                              ┌──────────────┬──────────────┬─────────────┐
                              │ admin/finance│    sales     │   worker    │
                              │  Layout.tsx  │ SalesLayout  │WorkerLayout │
                              └──────┬───────┴──────┬───────┴──────┬──────┘
                                     │              │              │
                                     ▼              ▼              ▼
                              ┌─────────────────────────────────────────┐
                              │          Pages (`src/pages/`)            │
                              │  Each page uses hooks + lib service calls│
                              └──────────────────┬──────────────────────┘
                                                 │
                                                 ▼
                              ┌─────────────────────────────────────────┐
                              │    Data Layer (`src/lib/`)               │
                              │  Pure async functions → Supabase client  │
                              └──────────────────┬──────────────────────┘
                                                 │
                                                 ▼
                              ┌─────────────────────────────────────────┐
                              │   Supabase (PostgreSQL + Auth + Realtime)│
                              │   `src/lib/supabase.ts`                  │
                              │   `supabase/functions/` (Edge Functions) │
                              └─────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `main.tsx` | Bootstrap: React Query client, StrictMode mount | `src/main.tsx` |
| `App.tsx` | Provider tree composition, top-level routing | `src/App.tsx` |
| `AuthProvider` | Supabase auth session, user profile, organisation | `src/contexts/AuthContext.tsx` |
| `NotificationProvider` | Real-time notifications, toast rendering, unread count | `src/contexts/NotificationContext.tsx` |
| `GlobalActionProvider` | Root-level create modals (lead/customer/order/quote/invoice) | `src/contexts/GlobalActionContext.tsx` |
| `RealtimeManager` | Supabase channel subscriptions → React Query cache invalidation | `src/components/RealtimeManager.tsx` |
| `ProtectedRoute` | Auth gate: renders `LoginPage` if no session | `src/components/ProtectedRoute.tsx` |
| `AppRoutes` | Role-based layout + route tree for `/app/*` | `src/components/AppRoutes.tsx` |
| `Layout` | Admin shell: Sidebar, Header, modals, toasts, breadcrumbs | `src/components/Layout.tsx` |
| `WorkerLayout` | Worker shell: WorkerNavigation, Header, toasts | `src/components/WorkerLayout.tsx` |
| `SalesLayout` | Sales shell: SalesNavigation, Header, toasts | `src/components/SalesLayout.tsx` |
| `PublicLayout` | Marketing site shell: sticky nav, footer | `src/layouts/public/PublicLayout.tsx` |
| `src/lib/*` | Domain service modules — all Supabase queries | `src/lib/` |
| `src/hooks/use*.ts` | React Query wrappers + state abstractions for pages | `src/hooks/` |

## Pattern Overview

**Overall:** Feature-slice SPA with role-based layouts and a service-layer data access pattern.

**Key Characteristics:**
- Context API for cross-cutting concerns (auth, notifications, global actions)
- React Query (`@tanstack/react-query`) for all server state — no Redux
- `src/lib/` holds all Supabase calls as plain async functions; hooks wrap them in `useQuery` / `useMutation`
- Role-gated routing inside `AppRoutes` (admin, sales, worker) without separate protected trees
- Supabase Realtime drives UI freshness via `RealtimeManager` → React Query `invalidateQueries`
- Lazy loading (`React.lazy`) for heavy pages and all role-specific layouts

## Layers

**Provider / Context Layer:**
- Purpose: Global state shared across the entire component tree
- Location: `src/contexts/`
- Contains: `AuthContext.tsx`, `NotificationContext.tsx`, `GlobalActionContext.tsx`
- Depends on: `src/lib/supabase.ts`, `src/lib/notifications.ts`
- Used by: Every component that needs auth, notifications, or global modals

**Routing Layer:**
- Purpose: Maps URLs to page components; enforces auth and role access
- Location: `src/App.tsx`, `src/components/AppRoutes.tsx`
- Contains: Route tree, `ProtectedRoute`, role switch logic
- Depends on: `AuthContext`, layout shells, page components
- Used by: Browser navigation

**Layout Layer:**
- Purpose: Structural chrome (sidebar, header, mobile nav, overlays) for each role
- Location: `src/components/Layout.tsx`, `src/components/WorkerLayout.tsx`, `src/components/SalesLayout.tsx`, `src/layouts/public/PublicLayout.tsx`
- Contains: Navigation, search modal, notification panel, chat overlay, toast container
- Depends on: `useLayoutState`, `useToast`, `useNotifications`, `AuthContext`
- Used by: `AppRoutes` (wraps all pages)

**Page Layer:**
- Purpose: Feature entry points; own their page-level state and data orchestration
- Location: `src/pages/`
- Contains: One TSX file per feature (e.g. `Invoices.tsx`, `Customers.tsx`, `Dashboard.tsx`)
- Depends on: domain hooks (`src/hooks/`), UI components (`src/components/`), lib services (`src/lib/`)
- Used by: Route definitions in `AppRoutes.tsx`

**Component Layer:**
- Purpose: Reusable UI: modals, forms, tables, management views, UI primitives
- Location: `src/components/` (flat + subdirectories)
- Contains: Feature-specific components (`InvoiceManagement.tsx`), shared UI (`src/components/ui/`), domain subgroups (`calendar/`, `kanban/`, `dashboard/`, `chat/`, `quotes/`, `invoices/`, `settings/`)
- Depends on: `src/lib/`, `src/hooks/`, `src/contexts/`
- Used by: Pages and other components

**Hook Layer:**
- Purpose: React Query data-fetching + local state abstractions consumed by pages
- Location: `src/hooks/`
- Contains: `useInvoices.ts`, `useDashboardData.ts`, `useKanbanData.ts`, `useLeads.ts`, `useRealtimeSubscription.ts`, `useLayoutState.ts`, `usePrefetch.ts`, etc.
- Depends on: `src/lib/`, `src/contexts/AuthContext`
- Used by: Pages and complex components

**Service / Data Access Layer:**
- Purpose: All Supabase CRUD operations — plain async functions, no React
- Location: `src/lib/`
- Contains: `database.ts` (general), `orders.ts`, `quotes.ts`, `invoices.ts`, `leads.ts`, `customers.ts`, `notifications.ts`, `fortnox.ts`, `payroll.ts`, `reports.ts`, `webhooks.ts`, `supabase.ts` (client singleton), etc.
- Depends on: `src/lib/supabase.ts`, `src/types/database.ts`
- Used by: Hooks, context providers, and occasionally pages directly

**Type Layer:**
- Purpose: Shared TypeScript types for the domain model
- Location: `src/types/`
- Contains: `database.ts` (all entity types + enums), `dashboard.ts` (widget/KPI types)
- Depends on: Nothing
- Used by: Entire codebase

**Edge Function Layer:**
- Purpose: Server-side logic requiring secrets or elevated permissions
- Location: `supabase/functions/`
- Contains: `send-email`, `send-sms`, `send-quote-email`, `fortnox-api`, `sync-fortnox`, `sync-from-fortnox`, `sync-google-calendar`, `create-user`, `create-notification`, `submit-lead-form`, `track-quote-view`, `notify-quote-event`, `dispatch-webhook`, `send-reminders`, `intranet-post-notification`, `intranet-weekly-summary`
- Depends on: Supabase Edge Runtime (Deno)
- Used by: `src/lib/` functions via `supabase.functions.invoke()`

## Data Flow

### Primary Request Path (Admin page)

1. User navigates to `/app/fakturor` — `AppRoutes` renders `<Invoices />` inside `Layout` (`src/pages/Invoices.tsx`)
2. `Invoices.tsx` calls `useInvoices(filters)` hook (`src/hooks/useInvoices.ts`)
3. `useInvoices` issues a `useQuery` call that invokes `getInvoices(organisationId, filters)` from `src/lib/invoices.ts`
4. `getInvoices` builds a Supabase `.from('invoices').select(...)` query with joins and filters, returns `{ data, count, error }`
5. React Query caches result under key `['invoice-data', organisationId, filters, activeTab]`
6. UI renders from cached data; React Query serves stale data for 60 s before revalidating

### Real-Time Update Path

1. Another user creates/updates a record in Supabase (e.g. an `invoices` row)
2. `RealtimeManager` (`src/components/RealtimeManager.tsx`) receives a `postgres_changes` event on its per-table Supabase channel
3. Change is debounced (500 ms), then `queryClient.invalidateQueries({ queryKey: ['invoices'] })` is called — only for query keys relevant to the current route
4. React Query refetches affected queries; UI updates automatically

### Auth Flow

1. `AuthProvider` (`src/contexts/AuthContext.tsx`) calls `supabase.auth.getSession()` on mount to restore session
2. `supabase.auth.onAuthStateChange` listener fires on login/logout
3. On login, `fetchUserProfile(userId)` fetches `user_profiles` row with joined `organisations` record
4. `ProtectedRoute` reads `{ user, loading }` from `AuthContext` — renders `LoginPage` if no user

### Global Modal Creation Path

1. Any component calls `useGlobalAction().openCreateInvoiceModal()` (from `src/contexts/GlobalActionContext.tsx`)
2. `GlobalActionProvider` sets `activeModal = 'createInvoice'`
3. Lazily-loaded `CreateInvoiceModal` renders at root level, outside any page's DOM tree
4. On success, modal calls `closeModal()`; the relevant page's React Query query is invalidated through its own mutation's `onSuccess`

**State Management:**
- Server state: React Query (`@tanstack/react-query`) with 60 s `staleTime`, `refetchOnWindowFocus: false`
- Auth/profile state: `AuthContext` (React state)
- Notification state: `NotificationContext` (React state + Supabase Realtime subscription)
- Layout/UI state: `useLayoutState` hook (React state, sidebar collapse persisted in `localStorage`)
- Theme: `localStorage` + `document.documentElement.classList`

## Key Abstractions

**Domain Service Modules (`src/lib/`):**
- Purpose: Encapsulate all database access per entity. Each module exports typed async functions returning `{ data, error }` or `{ data, count, error }`.
- Examples: `src/lib/orders.ts`, `src/lib/quotes.ts`, `src/lib/invoices.ts`, `src/lib/leads.ts`, `src/lib/notifications.ts`
- Pattern: `export const getOrders = async (orgId, filters, page, pageSize) => { ... supabase.from('orders').select(...) ... }`

**`*WithRelations` Interfaces:**
- Purpose: Typed joined query results extending base entity types with optional relation fields
- Examples: `OrderWithRelations`, `QuoteWithRelations`, `InvoiceWithRelations` — all in their respective `src/lib/*.ts` modules
- Pattern: `export interface OrderWithRelations extends Order { customer?: Customer; assigned_to?: UserProfile; ... }`

**Data-Fetching Hooks (`src/hooks/use*.ts`):**
- Purpose: React Query wrappers that read `organisationId` from `AuthContext` and call lib functions
- Examples: `src/hooks/useInvoices.ts`, `src/hooks/useDashboardData.ts`, `src/hooks/useKanbanData.ts`, `src/hooks/useLeads.ts`
- Pattern: `useQuery({ queryKey: [...], queryFn: () => libFunction(organisationId, ...) })`

**`useRealtimeSubscription` / `RealtimeManager`:**
- Purpose: Supabase channel management that debounces and invalidates React Query cache on DB changes
- Examples: `src/hooks/useRealtimeSubscription.ts`, `src/components/RealtimeManager.tsx`
- Pattern: Subscribe per table filtered by `organisation_id=eq.${organisationId}`; on event, invalidate relevant query keys

## Entry Points

**Browser Bootstrap:**
- Location: `src/main.tsx`
- Triggers: Vite dev server or production build serves `index.html` → imports `src/main.tsx`
- Responsibilities: Creates React Query client with defaults, mounts `<App />` in `StrictMode`

**Application Root:**
- Location: `src/App.tsx`
- Triggers: Rendered by `main.tsx`
- Responsibilities: Composes all providers, sets up the full route tree (public website, auth, protected app)

**Protected App Routing:**
- Location: `src/components/AppRoutes.tsx`
- Triggers: Rendered when user navigates to `/app/*` through `ProtectedRoute`
- Responsibilities: Fetches user role from `user_profiles`, renders role-specific layout + route set

**Public Standalone Routes:**
- `/quote-accept/:token` → `src/pages/QuoteAcceptance.tsx` — customer quote acceptance (no auth)
- `/forms/:formId` → `src/components/PublicLeadForm.tsx` — embedded lead capture form (no auth)

**Supabase Edge Functions:**
- Location: `supabase/functions/*/index.ts`
- Triggers: Invoked via `supabase.functions.invoke()` from `src/lib/` or by Supabase database webhooks/cron

## Architectural Constraints

- **Threading:** Single-threaded browser event loop. No Web Workers in use. All Supabase calls are async/await.
- **Global state:** `supabase` client singleton at `src/lib/supabase.ts`. React Query `queryClient` singleton created in `src/main.tsx`. No other module-level mutable singletons.
- **Multi-tenancy:** All data scoped by `organisation_id`. Every Supabase query filters `organisation_id=eq.${organisationId}`. Realtime channels also filter by `organisation_id`.
- **Role-based routing:** Role is fetched fresh from `user_profiles` on every `/app/*` mount in `AppRoutes`. Three exclusive route trees: admin/finance (default), sales, worker.
- **Lazy loading boundary:** Heavy pages (`Dashboard`, `Invoices`, `Settings`, `Documents`, `Reports`) and all role layouts are `React.lazy`. Role-specific pages (`WorkerDashboard`, `SalesDashboard`) are also lazy.
- **Circular imports:** `src/lib/quotes.ts` imports `createOrder` from `src/lib/orders.ts`. No other known circular chains.
- **Swedish locale:** All currency formatting uses `sv-SE` / `SEK` via `src/utils/formatting.ts`. Route paths are in Swedish (e.g. `/app/fakturor`, `/app/kunder`).

## Anti-Patterns

### Role fetch on every AppRoutes mount

**What happens:** `AppRoutes.tsx` fires a fresh `supabase.from('user_profiles').select('role')` query inside a `useEffect` every time the component mounts.
**Why it's wrong:** The full user profile (including role) is already available in `AuthContext.userProfile`. This creates a redundant network request and a loading flash.
**Do this instead:** Read `const { userProfile } = useAuth()` and derive `role = userProfile?.role` — no extra fetch needed. See `src/contexts/AuthContext.tsx` lines 46-62.

### Route paths mixed between `/app/` prefix and bare paths

**What happens:** `AppRoutes.tsx` defines routes without the `/app` prefix (e.g. `path="/kalender"`), while `navigation.ts` references full paths with prefix (e.g. `/app/kalender`). `react-router-dom`'s nested `<Routes>` strips the parent prefix, so this works — but is confusing.
**Why it's wrong:** Developers adding new routes must know the implicit prefix-stripping rule; omitting it or doubling the prefix breaks navigation silently.
**Do this instead:** Use relative paths in nested route definitions (e.g. `path="kalender"`) or add a comment at the top of `AppRoutes.tsx` explicitly documenting that all paths are relative to `/app/`.

## Error Handling

**Strategy:** Component-level error boundaries with route-level granularity; lib functions return `{ data, error }` objects; no global error state.

**Patterns:**
- Class component `ErrorBoundary` wraps all admin route page renders in `AppRoutes.tsx` via `RouteErrorBoundary` (`src/components/ErrorBoundary.tsx`)
- `src/lib/*.ts` functions catch errors and return `{ data: null, error: Error }` — callers check `result.error`
- Auth operations (`signIn`, `resetPassword`, etc.) in `AuthContext` use try/catch and return `{ error }` objects
- `NotificationContext` stores `error: string | null` and exposes `clearError()`
- `OfflineIndicator` component (`src/components/OfflineIndicator.tsx`) is rendered outside the Router for network status

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` directly — tagged with prefixes like `[AuthContext]`, `[Realtime]`, `[RealtimeManager]`. No structured logging library.
**Validation:** No dedicated validation library detected. Form validation is ad-hoc within modal components.
**Authentication:** Supabase Auth (JWT). `AuthContext` listens to `onAuthStateChange` and exposes `user`, `userProfile`, `organisation`, `organisationId`. `ProtectedRoute` enforces auth gate.
**i18n:** Not a full i18n library — Swedish UI strings are hardcoded throughout. Public website copy is centralized in `src/locales/publicContent.ts`.

---

*Architecture analysis: 2026-04-29*
