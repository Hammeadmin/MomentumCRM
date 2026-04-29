# Coding Conventions

**Analysis Date:** 2026-04-29

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` — `LeadManagement.tsx`, `CreateOrderModal.tsx`, `ErrorBoundary.tsx`
- Hooks: camelCase with `use` prefix `.ts` — `useLeads.ts`, `useAsyncAction.ts`, `useFormState.ts`
- Library/service modules: camelCase `.ts` — `database.ts`, `invoices.ts`, `leads.ts`
- Utility modules: camelCase `.ts` — `formatting.ts`, `statusMaps.ts`
- Type-only files: camelCase `.ts` — `database.ts` (in `src/types/`), `dashboard.ts`
- Locale/string files: camelCase `.ts` — `sv.ts`, `publicContent.ts`
- UI component barrel: `index.ts` exports all UI primitives from `src/components/ui/`

**Functions and Hooks:**
- Functions: camelCase — `createLead`, `getOrganisation`, `handleDatabaseError`
- Event handlers inside components: `handle` prefix — `handleSubmit`, `handleReload`, `handleGoHome`
- Custom hooks: `use` prefix, PascalCase body — `useLeads`, `useInvoiceActions`, `useRealtimeSubscription`

**Variables:**
- Local variables: camelCase — `organisationId`, `isLoading`, `activeTab`
- Module-level constants: UPPER_SNAKE_CASE — `LEAD_STATUS_CONFIG`, `PIPELINE_STAGES`, `LEAD_STATUS_BORDER_COLORS`
- Exported constant maps: PascalCase object names — `StatusLabels`, `ActivityTypeLabels`, `ActivityGradientColors`

**Types and Interfaces:**
- Interfaces: PascalCase — `LeadWithRelations`, `InvoiceData`, `AsyncActionOptions`
- Type aliases: PascalCase — `AsyncStatus`, `ButtonVariant`, `ButtonSize`, `StatusColorCategory`
- Database union types: PascalCase — `LeadStatus`, `OrderStatus`, `UserRole`
- Hook result types: `Use[Name]Result` pattern — `UseLeadsResult`, `UseInvoicesResult`
- Hook data types: `[Name]Data` pattern — `LeadsData`, `InvoiceData`, `DashboardStats`
- Dependency injection interfaces for hooks: `Use[Name]Deps` — `UseInvoiceActionsDeps`

**Zod Schemas:**
- Schema names: camelCase with `Schema` suffix — `leadCreateSchema`, `orderCreateSchema`, `invoiceLineItemSchema`
- Inferred types: PascalCase with `Input` suffix — `LeadCreateInput`, `OrderCreateInput`
- Parse functions: `parse[Entity]` — `parseLead`, `parseOrder`, `parseInvoice`

## Code Style

**Formatting:**
- No Prettier config detected — formatting is enforced only by TypeScript strict mode and ESLint
- 4-space indentation in most files (observed in hooks, lib modules)
- 2-space indentation in some older components (observed in `AuthContext.tsx`, `EmptyState.tsx`)
- Single quotes for string literals throughout

**Linting:**
- ESLint 9 flat config at `eslint.config.js`
- Extends `@eslint/js` recommended + `typescript-eslint` recommended
- Enforces `eslint-plugin-react-hooks` rules (hooks exhaustive deps)
- `react-refresh/only-export-components` warning enabled
- TypeScript strict mode: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`

## Import Organization

**Order (observed pattern):**
1. React and React ecosystem — `import React, { useState, useEffect } from 'react'`
2. Third-party libraries — `lucide-react`, `react-router-dom`, `@tanstack/react-query`
3. Internal contexts — `'../contexts/AuthContext'`
4. Internal hooks — `'../hooks/useLeads'`
5. Internal lib/service modules — `'../lib/leads'`, `'../lib/database'`
6. Internal types — `import type { ... } from '../types/database'`
7. Internal components — `'./EmptyState'`, `'./ConfirmDialog'`, `'./ui'`

**Type-only imports:**
- Use `import type { ... }` for type-only imports — enforced by TypeScript `isolatedModules`
- Example: `import type { Customer, UserProfile } from '../types/database'`

**Path Aliases:**
- No path aliases configured — all imports use relative paths (`../`, `./`)

**Barrel exports:**
- `src/components/ui/index.ts` exports all UI primitives
- `src/components/dashboard/index.ts` exports dashboard components
- `src/components/kanban/index.ts` exports Kanban components

## Error Handling

**Service layer (lib/) pattern — Result objects:**
```typescript
// All database functions return { data, error } tuples
const handleDatabaseError = (error: any): Error => {
  console.error('Database error:', error);
  if (error?.message) return new Error(error.message);
  return new Error('Ett oväntat databasfel inträffade');
};

export const getOrganisation = async (id: string): Promise<DatabaseResult<Organisation>> => {
  try {
    const { data, error } = await supabase.from('organisations').select('*').eq('id', id).single();
    if (error) return { data: null, error: handleDatabaseError(error) };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleDatabaseError(err) };
  }
};
```

**Hook layer pattern — throw for React Query:**
```typescript
// Hooks using useQuery throw errors; React Query catches them
queryFn: async () => {
  if (!organisationId) throw new Error('Organisation ID is required');
  const result = await getLeads(organisationId, filters);
  if (result.error) throw result.error;
  return result.data;
}
```

**Component layer pattern — toast notifications:**
- Errors surfaced via `useToast()` hook: `showError(title, message)` / `showSuccess(title, message)`
- `ErrorBoundary` wraps the app to catch uncaught React render errors
- `RouteErrorBoundary` wraps individual route components for per-route error isolation
- Development-only error detail: `process.env.NODE_ENV === 'development'` guard used in error boundaries

**Async action pattern (`useAsyncAction`):**
```typescript
// For mutations/imperative async operations
const { execute, isLoading, isError, error } = useAsyncAction(
  async (id: string) => { ... },
  { onSuccess: (data) => toast.success(...), onError: (err) => toast.error(...) }
);
```

**Zod validation pattern:**
```typescript
// All form/API input validated with Zod via parse* helpers
const result = parseLead(formData);
if (!result.success) {
  // result.errors is Record<string, string>
}
```

## Logging

**Framework:** `console` (no structured logging library)

**Patterns:**
- `console.error` used extensively in service and hook layers for database errors (568 occurrences across 125 files)
- `console.log` used in some components for debugging
- No log levels or structured logging — all plain `console.*` calls
- Error boundaries use `console.error('Error caught by boundary:', error, errorInfo)`

## Localisation (Swedish)

**All user-facing strings are Swedish (sv-SE).**

- Centralised in `src/locales/sv.ts` — exported as `const` objects: `NAV`, `KPI`, `INVOICES`, etc.
- Used via direct import: `import { INVOICES } from '../locales/sv'`
- `useTranslation` helper in `src/locales/sv.ts` provides typed access
- Validation error messages in Zod schemas are hardcoded Swedish strings: `'Titel är obligatoriskt'`
- `useFormState` required-field error is hardcoded: `'Detta fält är obligatoriskt'`
- Date/number formatting uses `Intl` with `sv-SE` locale throughout `src/utils/formatting.ts`

## Comments

**When to Comment:**
- JSDoc comments on exported hooks and utility functions (observed in `useLeads`, `useAsyncAction`, `useFormState`)
- Section separators using `// ===...===` style dividers used in utility files and larger modules
- Inline comments explaining non-obvious logic (query options, business rules)
- TODO comments are present but rare — only 4 instances found across the codebase

**JSDoc style:**
```typescript
/**
 * Custom hook to fetch Leads data.
 * Fetches leads, customers, and team members in parallel.
 *
 * @param filters - Optional filters for the leads query
 * @returns Object containing leads data, customers, team members, loading state, and error
 */
export function useLeads(filters: LeadFilters = {}): UseLeadsResult { ... }
```

**Section separators (used in lib/ and utils/ files):**
```typescript
// =============================================================================
// CURRENCY FORMATTING
// =============================================================================
```

## Function Design

**Size:** Functions in `lib/` are typically focused single-responsibility. Components are large (100–500+ lines) because they contain embedded sub-components and local state.

**Parameters:** Dependencies injection via single object param for hooks with many deps:
```typescript
export function useInvoiceActions(deps: UseInvoiceActionsDeps) { ... }
```

**Return Values:**
- Service functions return `Promise<{ data: T | null; error: Error | null }>`
- Hooks return plain objects with destructured state: `{ data, isLoading, error, refetch }`
- `useFormState` returns a tuple: `[FormState<T>, FormActions<T>]`

## Component Design

**Pattern:** Function components with named export (default) and typed `Props` interface:
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

function Button({ variant = 'primary', loading = false, ...props }: ButtonProps) { ... }

export default Button;
```

**Sub-components:** Co-located in same file when tightly coupled (e.g., `AnalyticsHeader` in `LeadManagement.tsx`, `EmptyIllustration` in `EmptyState.tsx`).

**Constants:** Status configs and style maps declared as `const` objects at module scope, before the component definition.

## Module Design

**Exports:**
- Default export for single-concept modules (components, hooks)
- Named exports for utilities with multiple exports (`src/utils/formatting.ts`, `src/utils/statusMaps.ts`)
- Both default and named exports in hooks: `export function useLeads(...) {}` + `export default useLeads;`

**Barrel Files:**
- Used for `src/components/ui/` — import as `import { Button, Modal } from './components/ui'`
- Used for `src/components/dashboard/` and `src/components/kanban/`
- Not used at the top `src/` level — features imported directly by path

---

*Convention analysis: 2026-04-29*
