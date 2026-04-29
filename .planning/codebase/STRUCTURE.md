# Codebase Structure

**Analysis Date:** 2026-04-29

## Directory Layout

```
MomentumCRM/                          # Repository root
├── public/                           # Static assets served as-is
├── src/
│   ├── assets/                       # Images, SVGs bundled by Vite
│   ├── components/                   # All reusable React components (flat + subdirs)
│   │   ├── calendar/                 # Calendar-specific sub-components
│   │   ├── chat/                     # Chat overlay sub-components
│   │   ├── dashboard/                # Dashboard widgets and sub-components
│   │   │   └── widgets/              # Individual draggable dashboard widgets
│   │   ├── invoices/                 # Invoice management sub-components
│   │   │   └── modals/               # Invoice modal sub-components
│   │   ├── kanban/                   # Kanban card and board sub-components
│   │   ├── public/                   # Components used only on public website
│   │   ├── quotes/                   # Quote management sub-components
│   │   ├── settings/                 # Settings panel sub-components
│   │   └── ui/                       # Generic reusable UI primitives
│   ├── config/                       # App-wide configuration constants
│   ├── contexts/                     # React Contexts (auth, notifications, global actions)
│   ├── hooks/                        # Custom hooks (data fetching, layout state, etc.)
│   ├── layouts/
│   │   └── public/                   # Public website layout (nav + footer shell)
│   ├── lib/                          # Supabase service modules (data access layer)
│   ├── locales/                      # Hardcoded UI strings (public website copy)
│   ├── pages/                        # Top-level page components (one per feature)
│   │   └── public/                   # Public website pages (marketing, signup, legal)
│   ├── supabase/
│   │   └── migrations/               # SQL migration files for local Supabase dev
│   ├── types/                        # Shared TypeScript type definitions
│   └── utils/                        # Pure utility functions (formatting, status maps)
├── supabase/
│   └── functions/                    # Supabase Edge Functions (Deno, one dir per function)
│       ├── create-notification/
│       ├── create-user/
│       ├── dispatch-webhook/
│       ├── fortnox-api/
│       ├── intranet-post-notification/
│       ├── intranet-weekly-summary/
│       ├── notify-quote-event/
│       ├── send-email/
│       ├── send-quote-email/
│       ├── send-reminders/
│       ├── send-sms/
│       ├── submit-lead-form/
│       ├── sync-fortnox/
│       ├── sync-from-fortnox/
│       ├── sync-google-calendar/
│       └── track-quote-view/
├── .planning/                        # GSD planning documents (not committed to main build)
│   └── codebase/
├── index.html                        # Vite HTML entry point
├── vite.config.ts                    # Vite build config
├── tailwind.config.js                # Tailwind CSS config
├── tsconfig.json                     # TypeScript project references root
├── tsconfig.app.json                 # TypeScript config for src/
├── tsconfig.node.json                # TypeScript config for Vite config file
├── postcss.config.js                 # PostCSS config (Tailwind + Autoprefixer)
├── eslint.config.js                  # ESLint flat config
├── netlify.toml                      # Netlify deploy config (build command, redirects)
└── package.json                      # npm scripts, dependencies
```

## Directory Purposes

**`src/components/`:**
- Purpose: All React UI components except page-level entry points
- Contains: Feature management components (`InvoiceManagement.tsx`, `LeadManagement.tsx`), modals (`CreateInvoiceModal.tsx`, `CreateOrderModal.tsx`), layout chrome (`Sidebar.tsx`, `Header.tsx`, `Layout.tsx`), infrastructure components (`ProtectedRoute.tsx`, `RealtimeManager.tsx`, `ErrorBoundary.tsx`, `AppRoutes.tsx`), and subdirectory groupings for calendar, chat, dashboard, invoices, kanban, quotes, settings, public, and UI primitives
- Key files: `src/components/AppRoutes.tsx`, `src/components/Layout.tsx`, `src/components/Sidebar.tsx`, `src/components/Header.tsx`, `src/components/RealtimeManager.tsx`, `src/components/ProtectedRoute.tsx`

**`src/components/ui/`:**
- Purpose: Generic reusable UI building blocks with no business logic
- Contains: `Badge.tsx`, `Breadcrumbs.tsx`, `Button.tsx`, `FilterBar.tsx`, `FilterTabs.tsx`, `Modal.tsx`, `PageSkeleton.tsx`, `Pagination.tsx`, `StatusBadge.tsx`, `SuccessAnimation.tsx`, `VirtualTable.tsx`, `index.ts` (barrel)
- Key files: `src/components/ui/index.ts` (re-exports all primitives)

**`src/components/dashboard/`:**
- Purpose: Dashboard-specific components and the draggable widget system
- Contains: `KPIGrid.tsx`, `SalesChart.tsx`, `ActivityFeed.tsx`, `DashboardCustomizer.tsx`, `DraggableWidgetWrapper.tsx`, `QuoteActivityWidget.tsx`; subdirectory `widgets/` contains individual widget implementations

**`src/components/dashboard/widgets/`:**
- Purpose: Individual lazy-loaded dashboard widgets
- Contains: `CashFlowWidget.tsx`, `JobStatusWidget.tsx`, `LeaderboardWidget.tsx`, `MyDayWidget.tsx`, `SalesGoalWidget.tsx`, `ScratchpadWidget.tsx`, `SmartBriefingWidget.tsx`, `WeatherWidget.tsx`, `WorldClockWidget.tsx`

**`src/contexts/`:**
- Purpose: React Context providers for global cross-cutting state
- Contains: `AuthContext.tsx` (auth session + user profile + organisation), `NotificationContext.tsx` (real-time notifications + toasts), `GlobalActionContext.tsx` (root-level create modals)
- Key files: All three files; every consumer uses a named `use*` hook exported from the same file

**`src/hooks/`:**
- Purpose: Custom React hooks — React Query data fetching wrappers and UI state abstractions
- Contains: `useInvoices.ts`, `useDashboardData.ts`, `useKanbanData.ts`, `useLeads.ts`, `useRealtimeSubscription.ts`, `useLayoutState.ts`, `usePrefetch.ts`, `useNotifications.tsx`, `useToast.ts`, `useAsyncAction.ts`, `useFormState.ts`, `useKeyboardShortcuts.ts`, `useVirtualList.ts`, `useMoveCard.ts`, `useInvoiceActions.ts`, `useInvoiceForm.ts`, `useDashboardPreferences.ts`

**`src/lib/`:**
- Purpose: Data access layer — all Supabase queries, mutations, and external API calls
- Contains: One module per domain entity plus cross-cutting services. All functions are plain async, not React hooks.
- Key files: `src/lib/supabase.ts` (singleton client), `src/lib/database.ts` (general/shared queries), `src/lib/orders.ts`, `src/lib/quotes.ts`, `src/lib/invoices.ts`, `src/lib/leads.ts`, `src/lib/notifications.ts`, `src/lib/fortnox.ts`, `src/lib/payroll.ts`, `src/lib/reports.ts`, `src/lib/webhooks.ts`

**`src/pages/`:**
- Purpose: Page-level components mounted by routes. One file per CRM module.
- Contains: `Dashboard.tsx`, `Customers.tsx`, `Leads.tsx`, `Quotes.tsx`, `Orders.tsx`, `Ordrar.tsx`, `Invoices.tsx`, `Payments.tsx`, `Calendar.tsx`, `Team.tsx`, `Analytics.tsx`, `Communications.tsx`, `Payroll.tsx`, `Intranet.tsx`, `Documents.tsx`, `Reports.tsx`, `Settings.tsx`, `WorkerDashboard.tsx`, `SalesDashboard.tsx`, `WorkerSchedule.tsx`, `WorkerTimesheet.tsx`, `WorkerProfile.tsx`, `OrderDetailPage.tsx`, `QuoteDetailPage.tsx`, `LoginPage.tsx`, `ResetPasswordPage.tsx`, `QuoteAcceptance.tsx`

**`src/pages/public/`:**
- Purpose: Public marketing website pages
- Contains: `LandingPage.tsx`, `FeaturesPage.tsx`, `PricingPage.tsx`, `AboutPage.tsx`, `ContactPage.tsx`, `CaseStudiesPage.tsx`, `SignupPage.tsx`, `CompleteSignupPage.tsx`, `VerifyEmailPage.tsx`, `Integritetspolicy.tsx`, `Anvandarvillkor.tsx`

**`src/types/`:**
- Purpose: Shared TypeScript type definitions — the domain model
- Contains: `database.ts` (all entity interfaces, enums, status types, `UserRole`, `OrderStatus`, etc.), `dashboard.ts` (KPI and widget types)

**`src/utils/`:**
- Purpose: Pure utility functions with no React dependencies
- Contains: `formatting.ts` (Swedish currency/date/number formatters using `sv-SE` locale), `statusMaps.ts` (status → label/color maps)

**`src/config/`:**
- Purpose: App-wide configuration objects
- Contains: `navigation.ts` (sidebar navigation item array with icons, hrefs, keyboard shortcuts)

**`src/locales/`:**
- Purpose: Centralized UI string content for the public website (not a full i18n library)
- Contains: `publicContent.ts` (all nav labels, footer text, page copy for the marketing site)

**`supabase/functions/`:**
- Purpose: Deno-based Supabase Edge Functions for server-side logic
- Generated: No (hand-written)
- Committed: Yes

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React root mount, QueryClient creation
- `src/App.tsx`: Provider tree, full route tree
- `index.html`: Vite HTML shell

**Configuration:**
- `vite.config.ts`: Build tool config
- `tailwind.config.js`: Tailwind theme and content paths
- `tsconfig.app.json`: TypeScript settings for `src/`
- `netlify.toml`: Deployment config and SPA redirect rule (`/* → /index.html`)
- `src/config/navigation.ts`: Sidebar nav items with icons and keyboard shortcuts

**Core Logic:**
- `src/components/AppRoutes.tsx`: Role-based routing and layout selection
- `src/contexts/AuthContext.tsx`: Auth state, profile, organisation
- `src/components/RealtimeManager.tsx`: Real-time Supabase subscriptions
- `src/lib/supabase.ts`: Supabase client singleton
- `src/lib/database.ts`: General/shared Supabase queries
- `src/types/database.ts`: All entity types and enums

**Supabase Migrations:**
- `src/supabase/migrations/`: SQL migration files for local dev schema

## Naming Conventions

**Files:**
- Page components: `PascalCase.tsx` matching the feature name — `Invoices.tsx`, `Dashboard.tsx`
- Component files: `PascalCase.tsx` — `CreateInvoiceModal.tsx`, `NotificationPanel.tsx`
- Hook files: `camelCase.ts` with `use` prefix — `useInvoices.ts`, `useLayoutState.ts`
- Service/lib modules: `camelCase.ts` matching entity name — `invoices.ts`, `orders.ts`, `quotes.ts`
- Type files: `camelCase.ts` — `database.ts`, `dashboard.ts`
- Utility files: `camelCase.ts` — `formatting.ts`, `statusMaps.ts`
- Edge functions: kebab-case directory names — `send-email/`, `sync-fortnox/`

**Directories:**
- Feature subdirectories: lowercase — `calendar/`, `kanban/`, `dashboard/`, `settings/`, `widgets/`
- Lib/hooks/contexts/utils: all lowercase

**Exports:**
- Context hooks exported as named exports from the same file as the provider: `export function useAuth()`, `export function useNotifications()`
- UI primitive components re-exported via `src/components/ui/index.ts` barrel

## Where to Add New Code

**New CRM feature page (admin role):**
- Primary page: `src/pages/NewFeature.tsx`
- Service module: `src/lib/newFeature.ts` — exports async functions calling `supabase.from('new_table')...`
- Data hook: `src/hooks/useNewFeature.ts` — wraps lib functions in `useQuery`/`useMutation`
- Register route in: `src/components/AppRoutes.tsx` under the admin `<Routes>` block
- Add nav item in: `src/config/navigation.ts`
- Tests: `src/pages/NewFeature.test.tsx` (or `src/lib/newFeature.test.ts` for service functions)

**New modal component (globally accessible):**
- If triggered from anywhere: add to `src/contexts/GlobalActionContext.tsx` pattern (lazy import, `GlobalModalType` union, open function)
- If feature-local: place in `src/components/` or in the relevant subdirectory (e.g. `src/components/invoices/`)

**New UI primitive:**
- Implementation: `src/components/ui/NewPrimitive.tsx`
- Export from: `src/components/ui/index.ts`

**New dashboard widget:**
- Widget component: `src/components/dashboard/widgets/NewWidget.tsx`
- Register in: `src/pages/Dashboard.tsx` (add to lazy imports + `getWidgetColSpan` switch + widget render block)
- Add widget ID type in: `src/types/dashboard.ts`

**New Supabase Edge Function:**
- Create directory: `supabase/functions/function-name/index.ts`
- Invoke from: appropriate `src/lib/*.ts` module via `supabase.functions.invoke('function-name', { body: ... })`

**New entity types:**
- Add interfaces and enums to: `src/types/database.ts`

**Shared utility functions:**
- Currency/date/number formatting: `src/utils/formatting.ts`
- Status label/color maps: `src/utils/statusMaps.ts`

## Special Directories

**`.planning/`:**
- Purpose: GSD planning documents and codebase analysis
- Generated: No
- Committed: Yes (planning artifacts)

**`src/supabase/migrations/`:**
- Purpose: SQL schema migrations for local Supabase development
- Generated: Partially (via `supabase db diff`)
- Committed: Yes

**`supabase/functions/`:**
- Purpose: Edge Function source code deployed to Supabase
- Generated: No (hand-written Deno TypeScript)
- Committed: Yes

**`public/`:**
- Purpose: Static files copied verbatim to build output (favicons, robots.txt, etc.)
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-29*
