# Testing Patterns

**Analysis Date:** 2026-04-29

## Test Framework

**Runner:** None — no test framework is installed or configured.

**Assertion Library:** None.

**Test Config:** None detected (`jest.config.*`, `vitest.config.*` not present).

**Run Commands:**
```bash
# No test commands available in package.json
# Available scripts: dev, build, lint, preview
npm run lint   # Only automated quality check available
```

## Test File Organization

**Location:** No test files exist anywhere in the repository.

**Naming:** Not applicable — no `.test.*` or `.spec.*` files found.

## Current Quality Gates

The only automated quality checks are:

**TypeScript compiler** (`tsc` via Vite build):
- Strict mode enabled: `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- Config: `tsconfig.app.json`

**ESLint** (`npm run lint`):
- Config: `eslint.config.js`
- Enforces React Hooks rules (exhaustive deps)
- Enforces `react-refresh` component export rules
- TypeScript-ESLint recommended ruleset

## What Should Be Tested (Not Currently Tested)

### Utility Functions — High Priority
These are pure functions with no dependencies, easiest to test:

- `src/utils/formatting.ts` — `formatSEK`, `formatDate`, `formatDateTime`, `formatRelativeTime`, `formatISODate`
- `src/utils/statusMaps.ts` — `getStatusLabel`, `getStatusColorClass`, `getStatusCategory`
- `src/lib/schemas.ts` — All Zod parse functions: `parseLead`, `parseOrder`, `parseQuote`, `parseInvoice`, `formatZodErrors`
- `src/lib/rot.ts`, `src/lib/rut.ts` — Swedish tax reduction validation logic

### Custom Hooks — Medium Priority
These contain business logic and can be tested with `@testing-library/react-hooks`:

- `src/hooks/useAsyncAction.ts` — Loading states, success, error, reset, `resetAfter` timer
- `src/hooks/useFormState.ts` — Validation, dirty tracking, field transformations, submit guard
- `src/hooks/useToast.ts` — Toast queue management
- `src/hooks/useLeads.ts` — Query key construction, error propagation from `Promise.all`
- `src/hooks/useInvoices.ts` — Tab-conditional fetching, data assembly

### Components — Medium Priority
UI primitives in `src/components/ui/` are stable and worth snapshot/interaction testing:

- `src/components/ui/Button.tsx` — All variant and size combinations, loading state, disabled state
- `src/components/ui/Modal.tsx` — Focus trap, Escape key, backdrop click
- `src/components/ui/Badge.tsx`, `StatusBadge.tsx` — Variant rendering
- `src/components/ErrorBoundary.tsx` — Error catch and fallback render

### Integration / Service Layer — Lower Priority (requires Supabase mock)
- `src/lib/database.ts` — CRUD operation flows
- `src/lib/leads.ts`, `src/lib/invoices.ts`, `src/lib/orders.ts` — Filter/query building

## Recommended Setup

If adding tests, the natural fit for this Vite + React + TypeScript stack is:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

**Vitest config** (add to `vite.config.ts`):
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

**Setup file** (`src/test/setup.ts`):
```typescript
import '@testing-library/jest-dom';
```

## Suggested Test File Structure

```
src/
├── utils/
│   ├── formatting.ts
│   └── formatting.test.ts     ← co-located unit tests
├── lib/
│   ├── schemas.ts
│   └── schemas.test.ts        ← co-located unit tests
├── hooks/
│   ├── useAsyncAction.ts
│   └── useAsyncAction.test.ts ← co-located hook tests
└── components/
    └── ui/
        ├── Button.tsx
        └── Button.test.tsx    ← co-located component tests
```

## Patterns to Follow When Tests Are Added

**Utility function test:**
```typescript
import { describe, it, expect } from 'vitest';
import { formatSEK, formatDate } from '../formatting';

describe('formatSEK', () => {
  it('formats whole numbers with SEK', () => {
    expect(formatSEK(1000)).toBe('1 000 kr');
  });
  it('handles zero', () => {
    expect(formatSEK(0)).toBe('0 kr');
  });
});
```

**Zod schema test:**
```typescript
import { describe, it, expect } from 'vitest';
import { parseLead } from '../schemas';

describe('parseLead', () => {
  it('returns success for valid input', () => {
    const result = parseLead({ title: 'Test Lead', status: 'new' });
    expect(result.success).toBe(true);
  });
  it('returns error when title is missing', () => {
    const result = parseLead({ status: 'new' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.title).toBeDefined();
    }
  });
});
```

**Hook test with React Testing Library:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAsyncAction } from '../useAsyncAction';

describe('useAsyncAction', () => {
  it('sets loading state during execution', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useAsyncAction(asyncFn));

    expect(result.current.isIdle).toBe(true);

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toBe('result');
  });

  it('captures error on failure', async () => {
    const asyncFn = vi.fn().mockRejectedValue(new Error('failed'));
    const { result } = renderHook(() => useAsyncAction(asyncFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('failed');
  });
});
```

**Component test:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Save</Button>);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('shows spinner when loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

## Mocking Supabase

When testing service functions, mock the Supabase client:

```typescript
import { vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockOrg, error: null }),
        }),
      }),
    }),
  },
}));
```

## Coverage

**Requirements:** None enforced (no coverage tooling configured).

**If added, recommended thresholds:**
```typescript
// vitest.config.ts
coverage: {
  reporter: ['text', 'lcov'],
  thresholds: { lines: 70, functions: 70 },
  include: ['src/utils/**', 'src/lib/schemas.ts', 'src/hooks/**'],
  exclude: ['src/components/**', 'src/pages/**'],
}
```

---

*Testing analysis: 2026-04-29*
