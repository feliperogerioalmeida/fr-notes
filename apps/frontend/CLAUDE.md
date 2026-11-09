# Frontend Conventions

## Stack

- Next.js 16 App Router, React 19
- Middleware file is `proxy.ts` (NOT `middleware.ts`) — this is the correct name in Next.js 16

## File Organization

- ALWAYS componentize — break pages into small, focused components for readability
- Each page route MAY have a `_components/` folder for components exclusive to that page — but ONLY when `page.tsx` would become too large or complex without it. If the page is simple (e.g., just renders a single shared component with props), keep everything in `page.tsx` directly
- `_components/` contains block/section components that compose the `page.tsx`
- Shared components used across multiple pages go in the top-level `components/` folder
- Keep `page.tsx` clean — it should mostly compose components, not contain logic or markup

## Components

- Prefer Server Components — use `'use client'` only when strictly necessary (event handlers, browser APIs, hooks, client libs)
- Functional components only
- For advanced form components (autocomplete, tags input, etc.) use [shadcn-form](https://www.shadcn-form.com) — check there before building custom form inputs
- Add shadcn components: `cd packages/ui && pnpm dlx shadcn@latest add [component]`, then move and fix imports

### CRITICAL: Always use shadcn/ui primitives — never raw HTML

This is a strict requirement. Before reaching for an HTML tag, check whether `@workspace/ui` already exports a shadcn component. The shadcn version handles a11y, focus, dark mode, and styling tokens consistently with the rest of the app — raw HTML does not.

| Need | shadcn (use this) | raw HTML (avoid) |
|------|-------------------|------------------|
| Text input | `Input` | `<input>` |
| Password input | `PasswordInput` | `<input type="password">` |
| Number input | `Input` + react-number-format | `<input type="number">` |
| Button | `Button` (with `variant` / `size`) | `<button>` |
| Anchor / internal link | `Link` from `next/link` (optionally `<Button asChild>` wrapping `<Link>`) | `<a href>` |
| Dropdown | `Select` | `<select>` |
| Checkbox | `Checkbox` | `<input type="checkbox">` |
| Radio | `RadioGroup` | `<input type="radio">` |
| Textarea | `Textarea` | `<textarea>` |
| Modal / dialog | `Dialog` | custom `<div role="dialog">` |
| Toast | `Sonner` (`toast.*` from `sonner`) | custom popup |
| Tabs | `Tabs` | `<div>`-based tab UI |
| Card / panel | `Card` (+ `CardHeader`, `CardContent`) | bespoke `<div>` with shadow utilities |
| Chart | shadcn chart components (Recharts-based) | direct Recharts / `<canvas>` |

The **single exception** is `app/global-error.tsx`: it replaces the entire `<html>` document and runs without providers or CSS, so it must use raw HTML primitives. Every other file MUST use shadcn.

When wiring a link inside a `Button`, use `asChild` so shadcn merges its styles into `next/link`:

```tsx
// GOOD
<Button asChild>
  <Link href="/dashboard">Voltar</Link>
</Button>

// BAD
<a href="/dashboard" className="rounded-md bg-primary px-4 py-2">Voltar</a>
```

If shadcn does not have what you need, ask before building custom — most cases already exist on https://ui.shadcn.com/docs/components.

## Data Fetching

- React Query (TanStack Query) in Client Components
- Native `fetch` in Server Components
- NEVER use `useEffect` — ALWAYS prefer React Query, event handlers, Server Components, or render-time logic
- Redirects MUST be handled in `proxy.ts` (middleware) — NEVER use `useEffect` or `router.replace/push` for redirects in Client Components. The middleware already fetches the profile and decides the correct route before the page renders. If a new protected route needs redirect logic, add it to `proxy.ts`
- Redirects in Server Components: use `redirect()` from `next/navigation`
- `console.error` / `console.log` go directly in the render body — NEVER wrap logging in `useEffect`
- The ONLY accepted uses of `useEffect`: hydration guards (e.g., `next-themes` mounted pattern) and fire-on-mount side effects with no user interaction trigger (e.g., auto-verify token on page load)
- Prefer `setQueryData` over `invalidateQueries` for optimistic updates
- Mutations: `useMutation` from React Query

## Forms

- ALWAYS use react-hook-form + Zod resolver + shadcn `<Form>` component — NEVER build forms with raw HTML inputs
- EVERY form MUST have a Zod schema for validation
- Number inputs: react-number-format

## Charts

- ALWAYS use shadcn/ui chart components (based on Recharts) — NEVER install or use a chart library directly

## Styling

- NEVER hardcode colors (e.g., `bg-[#0D1B2A]`, `text-white`) — ALWAYS use CSS variable classes (`bg-primary`, `text-card-foreground`)
- If a color does not exist in the theme, add it as a CSS variable in `packages/ui/src/styles/globals.css` (both `:root` and `.dark`) and map it in `@theme inline`
- Gradients MUST be defined as reusable classes in `globals.css` (e.g., `.gradient-primary`) — NEVER write inline `bg-gradient-to-*` with hardcoded color stops in components
- `cn()` for conditional classes
- Mobile-first responsive design

## URL State (nuqs)

- ALWAYS use [nuqs](https://nuqs.dev/) for URL search params state — NEVER use raw `useSearchParams()` or manual URL manipulation
- Use cases: filters, pagination, sorting, tabs, modals, any state that should be shareable via URL
- `NuqsAdapter` from `nuqs/adapters/next/app` MUST wrap the app in the root layout (inside `<body>`)
- Define parsers in a co-located `search-params.ts` file next to the page that uses them
- Use `createSearchParamsCache` + parsers for Server Components — call `cache.parse(searchParams)` in `page.tsx`
- Use `useQueryStates(parsers)` in Client Components — import the same parsers object for type-safety
- ALWAYS use typed parsers (`parseAsString`, `parseAsInteger`, `parseAsBoolean`, `parseAsStringEnum`, etc.) — NEVER parse manually
- Use `.withDefault()` to avoid `null` values when a sensible default exists
- Group related params with `useQueryStates` — use `useQueryState` only for a single isolated param

## API Client Generation (Orval)

- ALWAYS use [Orval](https://orval.dev/) to generate API clients from the OpenAPI spec — NEVER write manual fetch functions for endpoints covered by the spec
- Config lives in `orval.config.ts` at the app root
- Output settings: `client: 'react-query'`, `httpClient: 'fetch'`, `mode: 'tags-split'`
- Generated files go to `generated/endpoints/` (hooks) and `generated/model/` (types) — these are gitignored, regenerate with `pnpm orval`
- Custom mutator lives at `generated/custom-fetch.ts` — handles auth headers (credentials: include) and error throwing
- Run `pnpm orval` to regenerate after spec changes — NEVER manually edit generated files
- Use the generated hooks directly in components (e.g., `useGetApiMatchesRecent()`, `useGetApiStandings()`)
- Generated query keys are managed by Orval — NEVER create manual query keys for endpoints that have generated hooks
- For endpoints NOT in the spec, follow the existing manual pattern (React Query + fetch)
- Mock data (MSW): enabled via `mock: { type: 'msw' }` — generates `.msw.ts` files alongside hooks
- Mock handlers are aggregated in `generated/mocks/handlers.ts` and started via `MSWProvider` (wraps app in development only)
- To add mocks for new endpoints, import the generated `get<Tag>Mock()` function into `handlers.ts`
- `swagger.json` is gitignored — fetch from running API server (`GET /swagger.json`) before regenerating

## State

- Context API when prop drilling exceeds 3 levels
- React Query cache for server state
- Custom hooks prefixed with `use`
- Avoid `useMemo`/`useCallback` unless a proven performance issue exists

## Dates

- Dates arrive from the API in UTC
- Use dayjs with UTC plugin and `.local()` to display dates in the user's timezone
- NEVER manipulate dates without dayjs — avoid raw `Date` objects

## i18n / Dictionaries

- **NEVER hardcode user-facing strings** — ALL visible text (labels, messages, buttons, errors, page titles) MUST come from dictionaries
- The ONLY exception is `global-error.tsx`, which replaces the entire HTML and has no access to providers or CSS
- Dictionaries live in `app/[lang]/dictionaries/<locale>/` — one folder per locale (e.g., `pt-BR/`, `en-US/`)
- Each namespace is a separate `.json` file (e.g., `home.json`, `common.json`)
- `common.json` holds shared strings (navbar, footer, generic buttons, error/not-found pages)
- One `.json` file per page/feature — filename matches the namespace
- Use `getNamespace("home", locale)` in pages — loads only the needed namespace
- Use `getDictionary(locale)` only when ALL namespaces are needed
- When creating a new page, add its `.json` in every locale folder and update `dictionary.types.ts` + `dictionaries.ts` loaders
- Types are defined in `lib/dictionary.types.ts` — each namespace has its own interface
- Client Components that cannot use `server-only` loaders MAY import the JSON directly as a static import

## Authentication

- ALWAYS use `authClient.useSession()` from `@workspace/auth/client` to check session state — NEVER roll custom session checks
- Route group `(auth)` — public pages (sign-in, sign-up, etc.). Layout MUST redirect to `/dashboard` if session exists
- Route group `(protected)` — authenticated pages. Layout MUST redirect to `/sign-in` if no session
- Pages that require a token via searchParams (`reset-password`) MUST `redirect("/sign-in")` if token is missing; `verify-email-otp` requires an `email` searchParam from the sign-up redirect and MUST `redirect("/sign-in")` when absent
- Email verification uses **6-digit OTP** (not magic link) — sign-up redirects to `/verify-email-otp?email=...` and the user types the code; on success better-auth auto-creates the session via `emailVerification.autoSignInAfterVerification`
- Session check pattern in layouts: `isPending` → show spinner, `session` resolved → render or redirect

## Security

- Frontend only hides/shows UI — NEVER rely on frontend for permissions or security
- All validations happen on the backend — frontend only displays data
