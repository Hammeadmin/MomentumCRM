# Project Handoff Documentation: MomentumCRM

This document serves as the absolute source of truth for the MomentumCRM project, a Swedish CRM and business management system. It details the architecture, data flow, component relationships, and specific business logic implemented within the codebase.

## 0. Core Development Mandates
- **Language:** The entire application UI is strictly in **Swedish**. All labels, buttons, messages, placeholders, tooltips, and user-facing strings must be written in Swedish. Never introduce English text into the UI.
- **Responsive Design:** Every view, modal, and component must be fully optimized for both **desktop (PC) and mobile devices**. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) consistently. Touch targets must be adequately sized, layouts must reflow correctly on small screens, and no horizontal overflow should occur on mobile. This is a non-negotiable requirement for every UI change.

## 1. Project Overview & Tech Stack
MomentumCRM is a multi-tenant business management application tailored for the Swedish market, encompassing CRM, project management, quoting, invoicing (with Fortnox integration), payroll tracking, and internal communications.

**Core Technologies:**
- **Frontend Framework:** React 18, Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS (configured with a highly customized theme in `tailwind.config.js`, including premium design tokens, glassmorphism, custom typography, and dynamic animations).
- **State Management:** React Query (v5) for server state, React Context for global UI state.
- **Routing:** React Router DOM (v7).
- **Backend & Database:** Supabase (PostgreSQL, Edge Functions, Storage, Realtime).
- **Drag-and-Drop:** `@dnd-kit/core`, `sortable`, and `utilities` (used heavily in Kanban boards).
- **Utility Libraries:** `date-fns` (date formatting), `lucide-react` (icons), `zod` (validation), `recharts` (analytics), `jspdf` / `html2canvas` (PDF generation).

## 2. Directory Structure & Architecture
The project follows a modular, component-based SPA architecture with a clear separation between UI, state management, and API services.

- `src/components/`: Contains UI elements and feature-specific modules. Broken down into subdirectories like `ui/`, `settings/`, `kanban/`, `invoices/`, etc.
- `src/contexts/`: Global React Context providers (`AuthContext`, `GlobalActionContext`, `NotificationContext`).
- `src/hooks/`: Custom React hooks (`useInvoices`, `useKanbanData`, `useDashboardData`) bridging UI and services.
- `src/lib/`: The core service layer. Contains domain-specific business logic and Supabase client definitions (`invoices.ts`, `quotes.ts`, `fortnox.ts`, `rot.ts`, `rut.ts`).
- `src/pages/`: Top-level route components representing distinct views (e.g., `Dashboard.tsx`, `Orders.tsx`, `Calendar.tsx`).
- `src/layouts/`: Role-specific structural wrappers (`SalesLayout`, `WorkerLayout`, `PublicLayout`).
- `supabase/functions/`: Serverless Deno Edge Functions for backend processes, webhook handling, and external API communication.
- `supabase_schema_export.csv`: Contains the complete database schema mapping, including tables, RLS policies, and triggers.

## 3. Database Schema & Backend (Supabase)
The system uses PostgreSQL hosted on Supabase, relying heavily on Row Level Security (RLS) and database triggers.

**Core Tables:**
- `organisations`: The boundary for multi-tenancy. Most tables contain an `organisation_id` referencing this.
- `user_profiles`: Extends Supabase Auth with custom data, employment type, and roles (`admin`, `sales`, `finance`, `worker`).
- `customers`: Client registry, including specialized fields for Swedish tax deductions (`rot_personnummer`, `rot_fastighetsbeteckning`, etc.).
- `leads`: Pre-sales inquiries and opportunities.
- `quotes` & `quote_line_items`: Proposals generated for customers.
- `orders`: Confirmed deals / active projects residing in the Kanban pipeline.
- `invoices`: Billing records syncing with Fortnox.
- `time_logs` & `jobs`: Worker time tracking used for payroll.
- `intranet_posts` & `calendar_events`: Internal team coordination.

**Security (RLS):**
Almost all tables enforce `organisation_id = get_my_org()` to strictly isolate tenant data. Role-based policies (`get_my_role() = 'admin'::user_role`) dictate what specific user types can mutate.

**Edge Functions (`supabase/functions/`):**
Backend logic executed securely via Deno. Often invoked directly from `src/lib/` using `supabase.functions.invoke()`.
- **API Endpoints:** `fortnox-api`, `submit-lead-form` (public REST endpoint for external lead forms).
- **Cron Jobs:** `sync-fortnox` / `sync-from-fortnox` (bi-directional sync), `send-reminders` (automated overdue invoice/quote processing), `intranet-weekly-summary`.
- **Triggers:** `create-user` (listens to Supabase Auth signups), `create-notification`.
- **Event Dispatchers:** `send-email`, `send-sms`, `send-quote-email` (quote PDF compilation), `dispatch-webhook`, `intranet-post-notification`.
- **Analytics & Tracking:** `notify-quote-event`, `track-quote-view`.
- **Integrations:** `sync-google-calendar`.

## 4. Service Layer & External Integrations
The `src/lib/` directory encapsulates all core domain logic and external interactions.

**Core Database & Schemas:**
- **`database.ts` & `supabase.ts`:** Core Supabase client initialization, RPC wrappers, and TypeScript definitions. Hooks into the entire app.
- **`schemas.ts`:** Zod validation schemas for forms and API interactions.

**Domain Services:**
- **Core Entities (`src/lib/invoices.ts`, `quotes.ts`, `orders.ts`, `leads.ts`, `quoteTemplates.ts`):** Standard CRUD operations, pagination, and status progression for primary business objects.
- **Financials (`src/lib/creditNotes.ts`):** Business operations specifically tied to reversing or crediting existing invoices.
- **Fortnox (`src/lib/fortnox.ts`):** Handles OAuth, formatting, and syncing. Contains crucial logic to differentiate between private individuals (no org number sent) and companies.
- **ROT/RUT (`src/lib/rot.ts`, `src/lib/rut.ts`):** Calculates Swedish tax deductions based on labor percentages, material costs, and individual limits.
- **HR & Payroll (`src/lib/payroll.ts`, `src/lib/timeLogs.ts`, `src/lib/activityService.ts`):** Worker application logic, including clock-in/out, activity tracking, absence reporting, and monthly payroll/commission calculations.
- **Teams (`src/lib/teams.ts`):** Manages team assignments, workloads, and user roles within groups.
- **Search & UI Data (`src/lib/search.ts`, `src/lib/dashboard-widgets.ts`):** Handles global unified search across all entities and provides aggregated KPIs for dashboard widgets.

**Automations & Reporting:**
- **Reminders & Webhooks (`src/lib/reminders.ts`, `src/lib/webhooks.ts`):** Business logic for checking due dates, automated emails/SMS, and triggering external integrations.
- **Reports (`src/lib/reports.ts`):** Aggregates data to generate ROT/RUT reports for Skatteverket and internal sales analytics.

**Communications & Storage:**
- **Communications (`src/lib/communications.ts`, `sms.ts`, `email.ts`, `notifications.ts`, `intranet.ts`):** Manages message composition, internal notifications, team intranet event logic, and invokes Edge Functions.
- **Storage (`src/lib/storage.ts`, `documents.ts`):** Manages file uploads to Supabase Storage buckets.
- **Calendar (`src/lib/calendar.ts`):** Logic for interacting with `calendar_events` and invoking Google Calendar sync.

## 5. State Management & Data Flow
Data flows from Supabase -> `src/lib/` Services -> `src/hooks/` (React Query) -> Components.

- **`AuthContext`:** Tracks session state and initializes real-time subscriptions if applicable.
- **`GlobalActionContext`:** Centralizes the spawning of standard creation modals (e.g., `CreateLeadModal`, `QuoteEditModal`). This ensures feature parity across different views where entities can be created.
- **`NotificationContext`:** Houses the unified notification store, consuming both real-time DB changes and ephemeral UI toasts to centralize alert state across the system.
- **Custom Hooks (`src/hooks/`):**
  - `useInvoices`: Fetches, filters, and paginates invoice data via React Query.
  - `useKanbanData`: Structures order data into columns for `@dnd-kit`.
  - `useInvoiceActions`: Encapsulates mutation logic (creating, crediting, syncing invoices).

## 6. Routing & Authorization
Routing is managed centrally in `src/App.tsx` and `src/components/AppRoutes.tsx`.

- **Public & Auth Routes (Rendered within `PublicLayout`):**
  - Marketing: `/`, `/pris`, `/funktioner` (Styled by `LandingPage.css`).
  - Auth: `LoginPage.tsx`, `ResetPasswordPage.tsx`.
  - Interactive: `QuoteAcceptance.tsx` (For clients reviewing/accepting quotes).
- **Protected Routes (`/app/*`):** Wrapped in `<ProtectedRoute>`.
- **Role-Based Access Control (RBAC):** `AppRoutes.tsx` reads the user's role and renders specialized layouts and routes:
  - **`worker`:** Confined to `WorkerLayout`. Routes: `WorkerDashboard.tsx`, `WorkerSchedule.tsx`, `WorkerTimesheet.tsx`, `WorkerProfile.tsx`.
  - **`sales`:** Confined to `SalesLayout`. Routes: `SalesDashboard.tsx`, `Leads.tsx`, `Orders.tsx` (mapped to `/Säljtunnel`), `Ordrar.tsx` (mapped to `/Orderhantering`), `Communications.tsx`, `Customers.tsx`, `Quotes.tsx`, `Calendar.tsx`, `OrderDetailPage.tsx`, `QuoteDetailPage.tsx`.
  - **`admin` / `finance`:** Full access via the primary `Layout`. Routes: `Dashboard.tsx`, `Orders.tsx` (mapped to `/Säljtunnel`), `Ordrar.tsx` (mapped to `/Orderhantering`), `Customers.tsx`, `Leads.tsx`, `Quotes.tsx`, `Calendar.tsx`, `Invoices.tsx`, `Payments.tsx`, `Team.tsx`, `Settings.tsx`, `Analytics.tsx`, `Communications.tsx`, `Payroll.tsx`, `Documents.tsx`, `Reports.tsx`, `Intranet.tsx`, `OrderDetailPage.tsx`, `QuoteDetailPage.tsx`.
- **Deep-Dive Detail Pages:** `OrderDetailPage.tsx`, `QuoteDetailPage.tsx` (Used when standard modals are insufficient).
- Navigation structure is centralized in `src/config/navigation.ts` to populate sidebars and mobile menus dynamically.

## 7. Component Architecture
- **Kanban (`OrderKanban.tsx`):** A complex, drag-and-drop board mapping orders to stages. Relies heavily on `@dnd-kit` and interacts deeply with `QuoteEditModal.tsx` for workflow progression.
- **Virtual Tables (`InvoiceManagement.tsx`, `LeadManagement.tsx`):** Utilizes virtualization (likely `@tanstack/react-virtual` or similar) to render large datasets efficiently.
- **Modals Architecture:** The system employs a two-tier modal strategy to keep page components clean. 
  - **Lightweight Wrappers:** `CreateQuoteModal.tsx` and `CreateInvoiceModal.tsx` act as data-fetching orchestrators invoked globally via `GlobalActionContext`.
  - **Heavyweight Workers:** The wrappers pass data into the massive core form components like `QuoteEditModal.tsx` (64KB) and `CreateEditInvoiceModal.tsx` which handle the actual complex nested states (e.g., utilizing `LineItemsEditor.tsx`).
- **Template Builders (`TemplateBuilder.tsx`):** The primary interface for constructing rich quote and invoice templates. Utilizes a 3-column layout (Toolbox, Structure Panel, Canvas).

## 8. Dead Code & Unused Files
A systemic audit reveals that most components are tightly integrated, but there are areas requiring review for redundancy due to ongoing refactors:
1. **`QuoteCreationModal.tsx`:** This is an older legacy component. While it has been largely superseded by `QuoteEditModal.tsx` elsewhere in the app, it is NOT completely dead code—it is currently still actively imported and exclusively used by `CalendarView.tsx` to handle calendar-driven quote creation.
2. **Parallel Order Pipelines:** There is no dead code regarding orders, but rather two active, parallel features deployed in production routes. `Orders.tsx` (rendering `OrderKanban` and `OrderTable`) maps to `/Säljtunnel`. Simultaneously, `Ordrar.tsx` (rendering the distinct `ordermanagement.tsx` component) maps to `/Orderhantering`. Both actively exist in `AppRoutes.tsx`.
3. Legacy routing redirects (e.g., `/dashboard/*` redirecting to `/app/*`) exist but are intentional for backward compatibility.
4. **`BlockBasedTemplateEditor.tsx` & `QuoteTemplateSettings.tsx`:** These files are entirely orphaned and no longer imported by the active application routes. They have been superseded by `TemplateBuilder.tsx` and should be safely deleted.
5. **`Jobs.tsx` & `JobManagement.tsx`:** An exhaustive audit reveals these components (and their corresponding 48KB of logic) are completely unreferenced in the `AppRoutes.tsx` router. While worker jobs are handled elsewhere via `WorkerDashboard.tsx`, this dedicated manager page is dead code and should be removed.
## 9. Addendum: Overlooked Sub-Systems & File Mappings
While the primary architecture is mapped above, the following sub-systems and directories are strictly defined in the codebase and must be referenced for specific feature updates:

### A. The Public Frontend & Auth Flow (`src/pages/public/` & `src/components/public/`)
The main router summarizes public routes, but these React files handle the marketing and self-serve onboarding flow:
- **Pages:** `LandingPage.tsx`, `PricingPage.tsx`, `FeaturesPage.tsx`, `AboutPage.tsx`, `CaseStudiesPage.tsx`, `ContactPage.tsx`.
- **Legal:** `Anvandarvillkor.tsx`, `Integritetspolicy.tsx`.
- **Onboarding Flow:** `SignupPage.tsx`, `VerifyEmailPage.tsx`, `CompleteSignupPage.tsx` (Handles the multi-step tenant creation and user registration).
- **Public Components:** `DemoRequestModal.tsx`, `ROICalculatorModal.tsx`, `AnimatedMomentum.tsx`, `ImagePlaceholder.tsx`.

### B. The Settings Panel Architecture (`src/components/settings/`)
The system contains a massive, modular settings panel for organization admins:
- **Core Settings:** `SystemSettings.tsx`, `CompanyProfileSettings.tsx`, `UserProfileSettings.tsx`.
- **Integrations & Comms:** `IntegrationSettings.tsx`, `EmailSettings.tsx`, `SmsSettings.tsx`.
- **Data & Templates:** `ProductLibrarySettings.tsx`, `MessageTemplateManager.tsx`, `LeadFormBuilder.tsx`.
- *(Note: `messageTemplates.ts` in `src/lib/` drives the logic for the MessageTemplateManager).*

### C. The Chat Module (`src/components/chat/`)
Handles internal team communication and real-time messaging, utilizing Supabase WebSocket subscriptions (`chat_channels`, `chat_messages`).
- **Files:** `ChatOverlay.tsx`, `NewChatModal.tsx`.

### D. Granular Dashboard Widgets (`src/components/dashboard/widgets/`)
While `useDashboardData` orchestrates the grid, the specific isolated widget components injected into it are:
`CashFlowWidget.tsx`, `JobStatusWidget.tsx`, `LeaderboardWidget.tsx`, `MyDayWidget.tsx`, `SalesGoalWidget.tsx`, `ScratchpadWidget.tsx`, `SmartBriefingWidget.tsx`, `WeatherWidget.tsx`, `WorldClockWidget.tsx`.

### E. Page-Level Error & Layout Wrappers
- **`src/components/ErrorBoundary.tsx`:** Global error catching to prevent full React tree crashes.
- **`src/components/PageHeader.tsx`:** The reusable header component used inside nearly all protected page routes to display titles and breadcrumbs.

---

# Appendix A: Database & Integrations Deep Dive

## 1. Database Schema Breakdown
The following is an exhaustive list of every table in the PostgreSQL database and its primary purpose:

- `activity_log`: Tracks system actions and events across entities.
- `attendance`: Tracks employee daily attendance, hours, and status.
- `calendar_event_notes`: Notes associated with specific calendar events.
- `calendar_events`: Scheduled events, meetings, or job allocations linked to leads/jobs/orders.
- `chat_channels`: Defines chat rooms/channels for internal communication.
- `chat_messages`: Stores actual messages sent within chat channels.
- `communications`: Log of emails/SMS sent to customers, their status, and association with orders.
- `credit_notes`: Financial records for crediting existing invoices.
- `customers`: CRM client registry, distinguishing between private individuals (with ROT/RUT handling) and companies.
- `document_downloads`: Analytics tracking who downloaded which document.
- `documents`: Uploaded files, categorized with view permissions.
- `intranet_comments`: Comments made by users on intranet posts.
- `intranet_post_likes`: Records of likes on intranet posts.
- `intranet_post_views`: Analytics tracking views on intranet posts.
- `intranet_posts`: Internal company news, announcements, or bulletins.
- `invoice_emails`: Log of emails specifically sending invoices, with delivery statuses.
- `invoice_history`: Audit trail for actions performed on invoices.
- `invoice_line_items`: Individual line items (products/services) attached to an invoice.
- `invoices`: Billing records representing finalized orders, ready for or synced with Fortnox.
- `job_activities`: Audit log for updates made to jobs.
- `jobs`: Active work assignments derived from quotes/orders, tracking progress and deadlines.
- `lead_activities`: Audit log for updates and interactions on leads.
- `lead_forms`: Configurations for public-facing forms used to capture new leads.
- `lead_notes`: Internal notes specifically tied to a lead.
- `leads`: Pre-sales inquiries and unconfirmed opportunities.
- `message_templates`: Reusable templates for emails and SMS communications.
- `notifications`: User-specific in-app alerts and notifications.
- `order_activities`: Audit log for updates on orders.
- `order_attachments`: Files and documents directly attached to an order.
- `order_notes`: Internal notes associated with a specific order.
- `orders`: Confirmed deals mapped in the Kanban pipeline with assigned teams.
- `organisations`: The root entity for multi-tenancy. Holds settings, Fortnox credentials, and company info.
- `payroll_adjustments`: Manual additions or deductions to a user's payroll.
- `payroll_status`: Monthly tracking of whether payroll has been processed/paid for a user.
- `quick_texts`: Shortcuts and snippets for rapid text entry in the CRM.
- `quote_line_items`: Individual products or services attached to a quote.
- `quote_templates`: Reusable layouts and default line items for generating new quotes.
- `quote_view_analytics`: Aggregated statistics on quote views (unique visitors, counts).
- `quote_views`: Raw logs of when and from where a quote was viewed.
- `quotes`: Formal proposals sent to customers with pricing and ROT/RUT details.
- `reminder_logs`: Records of automated or manual reminders sent for quotes or invoices.
- `role_change_logs`: Audit trail mapping when and why a user's role was changed.
- `rot_report`: Reports containing aggregated data for ROT tax deductions to be sent to Skatteverket.
- `rss_feeds`: External RSS feeds integrated into the system (often for leads or industry news).
- `rut_report`: Reports containing aggregated data for RUT tax deductions.
- `sales_tasks`: To-do items for sales staff, often linked to orders.
- `saved_line_items`: A product/service library for quick insertion into quotes/invoices.
- `system_settings`: Global configurations for an organization (invoice numbers, formats, late fees).
- `task_notes`: Notes associated with specific sales tasks.
- `team_job_participation`: Tracks which team members worked on a job and their commission/hours.
- `team_members`: Maps users to specific teams with their role inside the team.
- `team_settings`: Workload thresholds and settings specific to team management.
- `teams`: Groupings of users (e.g., specialized work crews).
- `time_logs`: Granular time entries by workers, including breaks, materials used, and locations.
- `user_profiles`: Core user data extending auth, including employment terms, rates, and roles.
- `user_smtp_settings`: Custom SMTP configurations for users to send emails via their own provider.
- `view_dashboard_kpis`: (Database View) Aggregated KPIs for the dashboard.
- `view_recent_activity`: (Database View) Unified feed of recent system-wide activity.
- `webhook_logs`: Logs of triggered webhooks, including payloads and response statuses.
- `webhooks`: Configurations for external HTTP callbacks triggered by system events.
- `workload_assignments`: Records tracking the reassignment of workload from one user to another.

## 2. Fortnox Integration Data Flow (`src/lib/fortnox.ts`)
The Fortnox integration ensures bi-directional sync of customers and invoices. When an invoice is synced via `exportInvoice`, the following data flow occurs:

1. **Dependency Check:** The system verifies if the `customer` associated with the invoice has a `fortnox_customer_number`. If not, it triggers `exportCustomer` to sync the customer first.
2. **Customer Entity Handling:** 
   - `mapCustomerToFortnox` differentiates between company and private individuals via `customer.customer_type`.
   - **Companies:** The `org_number` is stripped of dashes/spaces. The Fortnox `OrganisationNumber` is set to this cleaned string, `VATNumber` is constructed as `SE[org_number]01`, and `Type` is set to `COMPANY`.
   - **Private Individuals:** The `OrganisationNumber` and `VATNumber` are deliberately left `undefined` (omitted from the payload), and `Type` is set to `PRIVATE`. This prevents Fortnox from rejecting the payload, as it strictly forbids company identifiers on private accounts.
3. **Invoice Payload Construction:** 
   - `mapInvoiceToFortnox` constructs the exact JSON payload:
     ```json
     {
       "CustomerNumber": "[fortnox_customer_number]",
       "InvoiceDate": "YYYY-MM-DD",
       "DueDate": "YYYY-MM-DD",
       "YourReference": "[customer.name]",
       "OurReference": "[order.title]",
       "Remarks": "[invoice.work_summary]",
       "InvoiceRows": [
         {
           "Description": "[Item Description]",
           "DeliveredQuantity": 1,
           "Price": 100,
           "VAT": 25, // Or 0 if customer.vat_handling is "omvänd byggmoms"
           "Unit": "st"
         }
       ]
     }
     ```
4. **Execution:** The payload is sent to the `fortnox-api` Edge Function, which acts as a secure proxy to Fortnox, applying the OAuth `access_token`.
5. **Persistence:** Upon a successful response, the local `invoices` table is updated with the returned `DocumentNumber` as `fortnox_invoice_number` and the `fortnox_synced_at` timestamp.

## 3. ROT & RUT Mathematical Logic (`src/lib/rot.ts`, `src/lib/rut.ts`)
Swedish tax deductions are processed mathematically before being attached to quotes or invoices. The logic distinguishes strictly between ROT (Construction) and RUT (Domestic services).

**ROT (Reparation, Ombyggnad, Tillbyggnad):**
- **Calculation (`calculateROTAmount`):**
  1. `Labor Cost = Total Amount * Labor Percentage` (Labor Percentage defaults to 1.0 if the input amount is already isolated as the labor portion).
  2. `ROT Deduction = Labor Cost * 0.30` (30%).
  3. `Final Amount = Math.min(ROT Deduction, 50000)` (Hard cap of 50,000 SEK per person).
- **Validation:** Requires both `rot_personnummer` and `rot_fastighetsbeteckning` (Property Designation). The Personnummer is validated using a regex format check and length validation (YYYYMMDD-XXXX).

**RUT (Rengöring, Underhåll, Tvätt):**
- **Calculation (`calculateRUTAmount`):**
  1. `Labor Cost = Total Amount * Labor Percentage`.
  2. `RUT Deduction = Labor Cost * 0.50` (50%).
  3. `Final Amount = Math.min(RUT Deduction, 75000)` (Hard cap of 75,000 SEK per person).
- **Validation:** Requires only `rut_personnummer`. It explicitly does **not** use property designations or organization numbers.

**Workflow Integration:**
These functions (`calculateNetAmountAfterROT/RUT = totalAmount - deduction`) are executed client-side to display net totals. When a client accepts a quote, they provide their identifiers via a public form, which invokes the `accept_quote_with_rot` RPC function on the backend to finalize the deduction application natively in the database.

---

# Appendix B: State and Component Matrix

## 1. Custom Hooks Mapping (`src/hooks/`)
The application relies on custom React hooks to manage server state (via React Query) and encapsulate complex business logic. Here is the strict mapping of the primary custom hooks:

### Data & API Hooks
- **`useInvoices`**
  - **Tables Queried:** `invoices`, `orders` (for ready-to-invoice), `customers`, `user_profiles`, `teams`, `system_settings`, `saved_line_items`, `quote_templates`, `organisations`.
  - **Imported By:** `src/components/InvoiceManagement.tsx`
  - **Description:** Orchestrates the fetching of all invoice-related data, caching it via React Query. Uses `Promise.all` for parallel fetching of support tables (settings, customers, templates) required by the UI.

- **`useInvoiceActions`**
  - **Tables Mutated:** `invoices`, `invoice_line_items`, `credit_notes`, and triggers Fortnox sync edge functions.
  - **Imported By:** `src/components/InvoiceManagement.tsx`
  - **Description:** Encapsulates the complex business workflows for creating, updating, duplicating, and crediting invoices. Also handles Fortnox synchronization workflows and bulk invoice processing.

- **`useKanbanData`**
  - **Tables Queried:** `orders`, `leads`, `quotes`, `customers`, `user_profiles` (team members), `teams`.
  - **Imported By:** `src/components/OrderKanban.tsx`
  - **Description:** Aggregates data for the drag-and-drop Kanban board. It optimizes data loading by fetching the top 20 items per status in parallel, and handles load-more pagination via React Query mutations.

- **`useLeads`**
  - **Tables Queried:** `leads`, `customers`, `user_profiles`.
  - **Imported By:** `src/components/LeadManagement.tsx`
  - **Description:** A simpler aggregation hook that fetches leads and their relational data (customers, assigned team members) based on applied filters.

- **`useDashboardData`**
  - **Tables Queried:** Selectively fetches KPIs via RPCs/Edge Functions or aggregations from `orders`, `leads`, `invoices`, `time_logs`, and custom views like `view_recent_activity`.
  - **Imported By:** `src/pages/Dashboard.tsx`
  - **Description:** Dynamically fetches widget-specific data based on user preferences. Uses conditional querying to prevent loading data for widgets that the user has disabled.

- **`useDashboardPreferences`**
  - **Tables Queried/Mutated:** `system_settings`, `user_profiles` (or local storage/preferences).
  - **Imported By:** `src/pages/Dashboard.tsx`, `src/components/dashboard/DashboardCustomizer.tsx`, and various widget components (`SalesGoalWidget.tsx`, `WeatherWidget.tsx`, `WorldClockWidget.tsx`, `ScratchpadWidget.tsx`).
  - **Description:** Manages the user-specific dashboard settings, determining widget visibility, layout preferences, and handling persistent storage with debounce logic to reduce database overhead.

### UI & Architecture Hooks
- **`useRealtimeSubscription.ts`:** Manages Supabase WebSocket connections. Crucial for live updates on the Kanban board and internal chat.
- **`useMoveCard.ts`:** Handles optimistic UI updates and backend mutations when dragging and dropping cards in `@dnd-kit`. The backbone of `OrderKanban.tsx`.
- **`useVirtualList.ts`:** Custom hook responsible for rendering virtualized tables to ensure performance with large datasets. Used in `InvoiceManagement.tsx` and `LeadManagement.tsx`.
- **`useToast.ts` & `useNotifications.tsx`:** Manages global ephemeral state for success/error popups. Hooked into `NotificationContext`.
- **`useAsyncAction.ts` & `useFormState.ts` & `useInvoiceForm.ts`:** Utility hooks that manage loading states, complex local form validation logic, and error boundaries for standalone modal architectures.
- **`useLayoutState.ts` & `useKeyboardShortcuts.ts`:** Manages sidebar toggling, responsive layout states, and global keyboard shortcuts.
- **`usePrefetch.ts`:** React Query utility to prefetch data (like customer details) on hover, making the UI feel instantaneous.

## 2. Complex Component Breakdown

### `OrderKanban.tsx`
**Purpose:** The central interactive hub for lead-to-order progression, utilizing `@dnd-kit` for drag-and-drop functionality.
- **Internal Prop Structure:** Top-level route component; accepts no props.
- **Child Components:**
  - `OrderKanbanRow`, `LeadKanbanRow`, `QuoteKanbanRow` (Inline row renderers for virtualized columns)
  - `CommunicationPanel` (For sending emails/SMS)
  - `EmptyState` & `ConfirmDialog`
  - `OrderStatusDropdown` & `OrderStatusBadge`
  - `StatusChangeHistory`
  - `EmailComposer` & `SMSComposer` (Lazy loaded to reduce initial bundle size)
  - `ROTFields` & `ROTInformation`
  - `CommissionAssignmentForm`
  - `SkeletonColumn` (Loading state UI)
  - `QuoteEditModal` & `QuoteDetailModal`

### `InvoiceManagement.tsx`
**Purpose:** Comprehensive billing dashboard allowing users to view, create, edit, sync (Fortnox), and manage invoices and credit notes.
- **Internal Prop Structure:** Top-level route component; accepts no props. Relies entirely on `useInvoices` and `useInvoiceActions` for state.
- **Child Components:**
  - `EmptyState` & `ConfirmDialog`
  - `ExportButton`
  - `ReminderModal` (For sending payment reminders)
  - `CreditNoteModal` & `CreditNotesList`
  - `PrintableInvoices` (Hidden component used by `react-to-print` for generating PDFs)
  - `CreateEditInvoiceModal` (Unified modal for creating or updating invoices)
  - `InvoiceDetailsModal` (Read-only view for a selected invoice)
  - `EmailInvoiceModal` (Modal specifically for dispatching invoice PDFs to customers)

### `TemplateBuilder.tsx`
**Purpose:** The definitive, active component for building rich, modular quote and invoice templates. It replaces legacy editors and provides a full drag-and-drop 3-column UI.
- **Internal Prop Structure:** Acts as a top-level settings view component; accepts no direct props. Retrieves `organisation_id` via the `useAuth` session.
- **Child Components:**
  - `ToolboxSidebar`: Left panel for selecting design options and adding new block types.
  - `StructurePanel`: Middle panel displaying the reorderable list of active blocks.
  - `CanvasArea`: Right panel providing a live preview of the document.
  - `ConfirmDialog`: Used for deletion confirmations.
- **Data Integrations:** Tightly coupled with `src/lib/quoteTemplates.ts` for CRUD operations and uses `src/lib/storage.ts` for direct image uploads (logos, cover photos) into tenant-specific Supabase buckets.

---

# Appendix C: Exhaustive File Map
To ensure this document serves as a 100% complete source of truth, the following is a categorized mapping of all remaining files within the `src/` directory tree that support the primary architecture.

## 1. System Roots & Configuration
- **`src/main.tsx` & `src/App.tsx`:** The React entry points. `App.tsx` defines the highest-level router boundaries (Auth vs Protected) and injects the global Context Providers.
- **`src/vite-env.d.ts`:** Vite environment variable typings.
- **`src/index.css`:** The global Tailwind CSS entry point containing custom directives.
- **`src/config/navigation.ts`:** Centralized configuration mapping route paths to their respective sidebar icons and labels, enforcing RBAC visibility.

### Root-Level Build & Environment Configurations
To fully map the repository, the root directory consists of:
- **`package.json` & `package-lock.json`:** Defines the exact Node dependencies, Vite dev server, and build scripts.
- **`vite.config.ts`:** The build tool configuration (plugins, aliases).
- **`tailwind.config.js` & `postcss.config.js`:** The global design system theme tokens and PostCSS processing rules.
- **`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`:** Strict TypeScript compiler configurations split between UI code and Node execution.
- **`eslint.config.js`:** The flat config file for linting rules.
- **`.env`:** Environment variables required for local testing.
- **`netlify.toml`:** Deployment configuration for hosting on Netlify.
- **`index.html`:** The Vite shell that mounts the React DOM.
- **`supabase_schema_export.csv`:** An exported artifact containing the raw database schema definition.

## 2. Shared Utilities (`src/utils/`)
- **`formatting.ts`:** Pure functions for localized Swedish formatting (Currency via `Intl.NumberFormat`, Dates, and Phone Numbers).
- **`statusMaps.ts`:** Maps backend database ENUMs (e.g., `quote_status`, `order_status`) to human-readable strings and corresponding Tailwind color classes for badges.

## 3. Localization (`src/locales/`)
- **`sv.ts`:** The primary Swedish translation dictionary used throughout the application UI.
- **`publicContent.ts`:** Hardcoded strings and structured data explicitly for the unauthenticated marketing landing pages (`/pris`, `/funktioner`).

## 4. Global Typings (`src/types/`)
- **`database.ts`:** Exhaustive TypeScript interfaces representing the exact schema of the Supabase PostgreSQL database, including joins.
- **`dashboard.ts`:** Interfaces defining the structure of dashboard widgets, KPIs, and grid layouts.

## 5. Sub-Layouts & Structural UI
- **`src/layouts/public/PublicLayout.tsx` & `LegalPageLayout.tsx`:** Wrappers for marketing pages providing the public header/footer.
- **`src/components/Layout.tsx`:** The master layout for Admin/Finance roles (Sidebar + Header + Main Content Area).
- **`src/components/SalesLayout.tsx` & `WorkerLayout.tsx`:** Stripped-down layout variants enforcing role-specific navigation arrays.
- **`src/components/ProtectedRoute.tsx`:** The highest-level security wrapper enforcing authentication state.
- **Navigation Components (`src/components/`):** `Sidebar.tsx`, `Header.tsx`, `MobileNavigation.tsx`, `MobileBottomNav.tsx`, `SalesNavigation.tsx`, `WorkerNavigation.tsx`.
- **Route Handlers:** `SalesRouteHandler.tsx`, `WorkerRouteHandler.tsx` (Handle nested routing logic within layouts).

## 6. Granular Component Taxonomy (`src/components/`)
The remaining React components are categorized by their functional domain:

### Entity Dashboards & Managers
Top-level layout containers for specific routes, often rendering tables or grids:
`CustomerManagement.tsx`, `LeadManagement.tsx`, `QuoteManagement.tsx`, `DocumentManagement.tsx`, `PayrollDashboard.tsx`, `ReportsDashboard.tsx`, `CommunicationDashboard.tsx`, `IntranetDashboard.tsx`, `IntranetManagement.tsx`, `TeamManagement.tsx`, `ReminderManagement.tsx`, `OrderTable.tsx`.

### Core Creation Modals
Lightweight wrapper modals invoked globally to create primary entities:
`CreateCustomerModal.tsx`, `CreateLeadModal.tsx`, `CreateOrderModal.tsx`, `CreateQuoteModal.tsx`, `CreateInvoiceModal.tsx`.

### Heavyweight Detail Modals
Modals that fetch and manage their own deep relational state, often spanning hundreds of lines of code:
`QuoteDetailModal.tsx`, `OrderDetailModal.tsx`, `PaymentDetailModal.tsx`, `TaskDetailModal.tsx`, `WorkerJobDetailsModal.tsx`.

### Feature-Specific Modals
Targeted interactive overlays for specific business actions:
`AbsenceModal.tsx`, `BulkAttendanceModal.tsx`, `CommissionAssignmentForm.tsx`, `ContactCustomerModal.tsx`, `CreditNoteModal.tsx`, `EmployeePayrollModal.tsx`, `EmployeePayrollSettingsModal.tsx`, `IntranetFeedModal.tsx`, `InvitationPreviewModal.tsx`, `PayrollAdjustmentModal.tsx`, `PayrollReportsModal.tsx`, `ProductLibraryModal.tsx`, `QuotePreviewModal.tsx`, `ReminderModal.tsx`, `SearchModal.tsx`, `SendCustomerReminderModal.tsx`, `SendQuoteModal.tsx`, `TimeEntryModal.tsx`, `TimeReportModal.tsx`.

### Reusable UI Elements & Sub-Components
Atomic UI building blocks and domain-specific fragments used inside larger pages:
- **Calendar Elements:** `CalendarEventCard.tsx`, `CalendarFilters.tsx`, `CalendarLegend.tsx`, `CalendarQuickActions.tsx`, `RegionTabs.tsx`, `ScheduleSwimlanes.tsx`.
- **Dashboard & Kanban Elements:** `ActivityDetailModal.tsx`, `ActivityFeed.tsx`, `AnimatedCounter.tsx`, `DraggableWidgetWrapper.tsx`, `KPIGrid.tsx`, `QuoteActivityWidget.tsx`, `SalesChart.tsx`, `KanbanCard.tsx`.
- **Invoicing/Financial Elements:** `CreditNotePreview.tsx`, `CreditNotesList.tsx`, `InvoiceCreditHistory.tsx`, `InvoicePreview.tsx`, `PaymentsTable.tsx`, `ROTFields.tsx`, `ROTInformation.tsx`, `ROTReport.tsx`, `RUTFields.tsx`, `RUTInformation.tsx`, `RUTReport.tsx`, `SalesFunnelChart.tsx`, `QuoteAnalytics.tsx`.
- **Forms & Inputs:** `EmailComposer.tsx`, `SMSComposer.tsx`, `LineItemsEditor.tsx`, `ProductConfigurator.tsx`, `PublicLeadForm.tsx`, `SearchBar.tsx`, `QuickTexts.tsx`, `PayrollEmployeeForm.tsx`.
- **System & Feedback UI:** `ConfirmDialog.tsx`, `EmptyState.tsx`, `ExportButton.tsx`, `FAQ.tsx`, `HelpTooltip.tsx`, `KeyboardShortcuts.tsx`, `LoadingSpinner.tsx`, `OfflineIndicator.tsx`, `NotificationPanel.tsx`, `NotificationToast.tsx`, `Toast.tsx`, `ToastContainer.tsx`, `RealtimeManager.tsx`, `SuccessAnimation.tsx`.
- **Miscellaneous Display:** `IntranetPostView.tsx`, `LocationMap.tsx`, `OrderStatusBadge.tsx`, `OrderStatusDropdown.tsx`, `StatusChangeHistory.tsx`, `QuoteTemplateSelector.tsx`, `QuotePreview.tsx`, `RssFeedWidget.tsx`, `TaskDashboardWidget.tsx`, `TimeTrackingWidget.tsx`, `UserGuide.tsx`, `StyleEditor.tsx`, `WireframePreview.tsx`.

### Low-Level Primitives (`src/components/ui/`)
Contains primitive, globally shared interface components:
`Breadcrumbs.tsx`, `FilterBar.tsx`, `FilterTabs.tsx`, `KeyboardShortcutsHelp.tsx`, `PageSkeleton.tsx`, `Pagination.tsx`, `SkeletonCard.tsx`, `VirtualTable.tsx`, plus custom Buttons, Inputs, Cards.

### Sub-Directories
- `src/components/calendar/`, `chat/`, `dashboard/`, `invoices/`, `kanban/`, `public/`, `quotes/`, `settings/`: Contain highly isolated, domain-specific sub-components that support their respective parent architectures.

### Integrations
- `FortnoxCallback.tsx`: The dedicated OAuth callback receiver component for the Fortnox integration handshake.

## 7. Infrastructure Definitions (`supabase/`)
While Section 3 covers the Edge Functions, the infrastructure folder also contains:
- **`supabase/config.toml`:** Local Supabase emulator configuration.
- **`supabase/migrations/`:** A directory containing exactly 49 sequential `.sql` migration files dictating the evolution of the database schema from its inception to its current optimized state (e.g., adding RLS policies, indexing views, generating payroll RPCs).
