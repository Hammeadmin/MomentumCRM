# Technology Stack

**Analysis Date:** 2026-04-29

## Languages

**Primary:**
- TypeScript 5.5 - All frontend source code in `src/`
- TypeScript (Deno runtime) - All Supabase Edge Functions in `supabase/functions/`

**Secondary:**
- SQL - Database migrations in `supabase/migrations/`
- JavaScript - Config files (`eslint.config.js`, `postcss.config.js`, `tailwind.config.js`)

## Runtime

**Frontend:**
- Browser (ES2020 target, DOM APIs)
- Node.js used only for build tooling

**Edge Functions:**
- Deno — all 16 Edge Functions run on Deno via Supabase platform

**Package Manager:**
- npm (implied by `package.json` structure)
- Lockfile: Not detected in worktree root (check main repo)

## Frameworks

**Core:**
- React 18.3 - UI framework (`src/`)
- React Router DOM 7.7 - Client-side routing (`src/App.tsx`, `src/pages/`)

**Styling:**
- Tailwind CSS 3.4 - Utility-first CSS; config at `tailwind.config.js`
  - Dark mode: `class` strategy
  - Custom semantic color tokens via CSS variables (HSL)
  - Custom fonts: Poppins (primary), Inter (body/secondary)
  - Custom animations: fade-in, slide-in, float, glass shadows
- PostCSS 8.4 - CSS processing; config at `postcss.config.js`
- Autoprefixer 10.4 - Vendor prefixing

**Data Fetching / State:**
- TanStack React Query 5.90 - Server state management and caching
- TanStack Virtual 3.13 - Virtualized lists for large data sets

**Build / Dev:**
- Vite 7.3 - Dev server and production bundler; config at `vite.config.ts`
  - Plugin: `@vitejs/plugin-react` 4.3
  - `lucide-react` excluded from dep optimization
  - Chunk size warning limit: 1000 KB (manual chunking removed due to circular dep issues)

**Linting:**
- ESLint 9.9 - Linting; config at `eslint.config.js`
  - `typescript-eslint` 8.3
  - `eslint-plugin-react-hooks` 5.1
  - `eslint-plugin-react-refresh` 0.4

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.53.1 - Database, auth, storage, realtime, Edge Function invocation; client at `src/lib/supabase.ts`
- `react-router-dom` ^7.7.1 - All routing; critical for page navigation and public quote/lead form pages

**UI / Interaction:**
- `lucide-react` ^0.344.0 - Icon library (excluded from Vite dep optimization)
- `@dnd-kit/core` ^6.3.1, `@dnd-kit/sortable` ^10.0.0, `@dnd-kit/utilities` ^3.2.2 - Drag-and-drop (Kanban board)
- `canvas-confetti` ^1.9.4 - Celebratory animations on quote acceptance
- `recharts` ^3.1.2 - Dashboard charts and reporting graphs

**Data / Math:**
- `date-fns` ^4.1.0 - Date formatting and manipulation throughout the app
- `zod` ^4.3.2 - Runtime schema validation; schemas at `src/lib/schemas.ts`
- `mathjs` ^15.1.1 - Mathematical expression evaluation (pricing/ROT/RUT calculations)

**PDF / Document Export:**
- `jspdf` ^4.0.0 - PDF generation for invoices and quotes
- `html2canvas` ^1.4.1 - HTML-to-canvas for PDF capture
- `react-to-print` ^3.2.0 - Print-to-PDF for documents
- `react-pdf-js` ^5.1.0 (devDep) - PDF rendering in browser

**Email (Edge Functions only):**
- `nodemailer` 6.9.13 (npm, via Deno) - SMTP email dispatch in `send-email`, `send-reminders`
- `resend` 3.2.0 (esm.sh, Deno) - Resend SDK in `intranet-weekly-summary`

## Configuration

**Environment (frontend — Vite):**
- `VITE_SUPABASE_URL` — Supabase project URL (required, throws on missing; `src/lib/supabase.ts`)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key (required; `src/lib/supabase.ts`)
- `VITE_FORTNOX_CLIENT_ID` — Fortnox OAuth app client ID (`src/lib/fortnox.ts`)
- `VITE_GOOGLE_MAPS_API_KEY` — Google Maps embed key (`src/components/LocationMap.tsx`)

**Environment (Edge Functions — Deno):**
- `SUPABASE_URL` — Auto-injected by Supabase platform
- `SUPABASE_SERVICE_ROLE_KEY` — Auto-injected by Supabase platform (service role for admin ops)
- `RESEND_API_KEY` — System email fallback (used in `send-email`, `send-reminders`, `send-quote-email`, `intranet-weekly-summary`)
- `FORTNOX_CLIENT_ID` — Fortnox OAuth client ID (Edge Function side; `supabase/functions/fortnox-api/`)
- `FORTNOX_CLIENT_SECRET` — Fortnox OAuth client secret (`supabase/functions/fortnox-api/`)

**TypeScript Config:**
- Config: `tsconfig.app.json`
- Target: ES2020, strict mode on
- `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` enabled
- Module resolution: `bundler` mode, no emit (Vite handles output)

**Build Config:**
- `vite.config.ts` — Single plugin (`@vitejs/plugin-react`), automatic chunk splitting

## Platform Requirements

**Development:**
- Node.js (version unspecified — no `.nvmrc` present)
- npm
- Supabase CLI (for running/deploying Edge Functions and migrations)

**Production:**
- Frontend: Static hosting (Vite `dist/` output — compatible with Netlify, Vercel, Supabase Storage, etc.)
- Backend: Supabase platform (PostgreSQL + Auth + Storage + Edge Functions on Deno)

---

*Stack analysis: 2026-04-29*
