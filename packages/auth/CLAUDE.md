# @workspace/auth — Shared Auth Package

## Overview

Reusable authentication components and client for Better Auth, shared across all frontends in the monorepo.

## Structure

- `src/client.ts` — `authClient` created via `createAuthClient` from `better-auth/react`
- `src/types.ts` — all prop interfaces and label types for form components
- `src/schemas/` — Zod validation schemas for each form
- `src/components/` — 6 form components (sign-in, sign-up, forgot-password, reset-password, verify-email, two-factor)

## Design Decisions

- Components accept `labels` as props — no hardcoded strings, i18n-ready
- Components accept `onSuccess`/`onError` callbacks — no hardcoded navigation
- Uses `next/link` for navigation links (all frontends are Next.js)
- `VerifyEmailCard` uses `useEffect` on mount to auto-verify token

## Component Pattern

Each form component receives:
- `labels: XxxFormLabels` — all user-facing strings
- `onSuccess?: () => void` — called after successful action
- `onError?: (error: string) => void` — called on API error
- Href strings for navigation links (e.g., `signInHref`, `signUpHref`)
