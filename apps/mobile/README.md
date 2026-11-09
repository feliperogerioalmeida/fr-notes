# Mobile

React Native + Expo app of the monorepo, targeting the Apple App Store and Google Play.

## Stack

- Expo + Expo Router (file-based routing under `src/app/`)
- NativeWind v4 + Tailwind v3 (pinned to stay aligned with React Native Reusables)
- React Native Reusables primitives in `src/components/ui/`
- Better Auth (`@better-auth/expo` + `expo-secure-store`) sharing Zod schemas with the web app via `@workspace/auth/schemas`
- React Query + Orval-generated API client

## Setup

```bash
cp .env.example .env
pnpm install
pnpm --filter mobile start
```

The app is intentionally out of `turbo run dev` — the Metro bundler runs on demand,
separately from the web/API dev servers.

`EXPO_PUBLIC_API_URL` must point to a backend reachable from the device running the app —
`http://localhost:3000` for simulators, the machine LAN IP for physical devices.

## API client

The OpenAPI spec is downloaded from `$EXPO_PUBLIC_API_URL/swagger.json` and the client is
generated into `src/api/endpoints/` and `src/api/model/` (both gitignored):

```bash
pnpm orval
```

The backend must be running for generation to work.

## Theme

Color tokens mirror `packages/ui/src/styles/globals.css` (the web palette). Changing a color
on the web requires updating `src/global.css`, `tailwind.config.js` and `src/lib/theme.ts`.
