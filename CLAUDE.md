# Monorepo Conventions

## Stack

- pnpm workspaces + Turborepo, packages scoped as `@workspace/*`
- ESM everywhere — imports MUST use `.js` extension
- Named exports only — NEVER use default exports
- All code MUST be written in English

### Apps

- `apps/desktop` — FR Notes desktop (Tauri 2 + Rust native core + React/Vite), the main product
- `apps/backend` — Fastify API (future FR sync API for notes)
- `apps/frontend` — Next.js web app (shadcn/ui via `@workspace/ui`)
- `apps/mobile` — React Native + Expo app (future FR Notes for in-person meetings), shipped to the Apple App Store and Google Play

### Packages

- `packages/core` — FR Notes domain shared by desktop, mobile and sync: Zod schemas, SQLite migrations + repositories behind the `SqlClient` interface, transcript formatting, LLM prompts and built-in templates
- `packages/ui` — shadcn/ui + FR brand tokens (`globals.css`); `cn()` knows the brand font-size tokens (`text-body-sm`, `text-caption`…) so tailwind-merge never drops them

## Desktop (Tauri)

- Run with `pnpm --filter desktop start` (`tauri dev`); there is NO `dev` script on purpose, so `turbo run dev` does not compile Rust
- To test anything that needs macOS permissions (mic, system audio, calendar), use `pnpm --filter desktop start:app`: it builds and opens a real `FR Notes.app`, so TCC prompts are attributed to the app instead of the terminal. Run `pnpm --filter desktop setup:signing` once to create the local "FR Notes Development" signing identity, otherwise ad-hoc signatures make macOS ask again after every build
- Distribution is a `.dmg` (no App Store) with Tauri's updater. Ship a version with `pnpm --filter desktop release <x.y.z> "notes"`: it bumps `tauri.conf.json` / `Cargo.toml` / `package.json`, builds, signs the update with `~/.tauri/fr-notes-updater.key` (NEVER commit it; losing it means installed apps can no longer verify updates) and publishes the `.dmg`, `.app.tar.gz` and `latest.json` to the GitHub Releases of the public repo `feliperogerioalmeida/fr-notes` (only the desktop app publishes GitHub Releases, so `releases/latest` always points to it). `PUBLISH=false` builds locally only. The app checks for updates on launch and every 6 h, installs in the background, never restarts during a recording
- Calendar = Apple Calendar via EventKit (every account in Calendar.app: iCloud, Google, Exchange), READ-ONLY on purpose: the Agenda (Day/Week/Month/List) only shows events, joins and records them. Creating/editing events, Google accounts, invites and Meet links belong to FR Hub/Jarvis, not FR Notes. Meeting detection = apps using the microphone (CoreAudio process objects) matched against `KNOWN_MEETING_APPS` in `@workspace/core`
- The floating nub has two modes driven from the main window: a recording pill and a "meeting detected" prompt card (`nub:prompt` event); the main window owns all state and the nub only renders and forwards clicks
- Rust lives in `apps/desktop/src-tauri` (audio capture with cpal + ScreenCaptureKit, Deepgram WebSocket, Keychain secrets, tray, floating "nub" window). The React side talks to it ONLY through `src/lib/native.ts` (commands + events) — keep names in sync with `src-tauri/src/commands.rs` and `events.rs`
- Data is local-first SQLite via `tauri-plugin-sql`, accessed only through `@workspace/core` repositories; every table keeps `id` (UUID), `created_at`, `updated_at`, `deleted_at` (soft delete) for future sync
- Secrets (Deepgram key, LLM key) live in the macOS Keychain — NEVER in SQLite, settings or env files
- Next steps ("action items") are parsed from the AI notes markdown (`- [ ] Owner — task (due)`) by `extractActionItems` and synced into `action_items` on every `enhancedMarkdown` save; checking one updates both the table and the markdown
- Speaker names: while recording, `src-tauri/src/speaker_ax` polls the meeting app's Accessibility tree (`speaker-ax:snapshot` event, Chromium web content enabled via `AXManualAccessibility`); `readRoster` in `@workspace/core` finds participants and who is active, and `attributeSpeakers` matches that timeline against Deepgram's diarized voices to fill `speakerNames` (never overriding names the user set). With "Salvar diagnóstico local" on, raw snapshots go to `~/Library/Application Support/dev.feliperogerio.notes/speaker-diagnostics/<noteId>/` for 14 days — use them as fixtures when improving per-app readers
- Connections (ClickUp, Linear, Notion, Slack) live in `@workspace/core/connections` as pure functions that receive an injected `HttpFetch` (the desktop passes `src/lib/http-client.ts`, backed by plugin-http). Nothing is sent automatically: the user picks the destination per item or note. Tokens live in the Keychain as `connection_token:<id>`
- Search: FTS4 tables `notes_fts` / `segments_fts` (accent-insensitive `unicode61 remove_diacritics=2`) kept in sync by SQLite triggers; FTS4 instead of FTS5 because sql.js (preview + tests) has no FTS5. "Perguntar" retrieves transcript moments through the same index (`findMeetingContext`) and stores cited sources with each answer in `chat_messages.sources_json` (thread id `all-meetings`)
- Slow self-hosted models: while recording, `digest-tracker` summarizes every ~10 min of transcript into `transcript_digests`; enhancement then sends the digests + only the undigested tail. The UI estimates read time from a per-model rate calibrated in localStorage
- Meeting audio (setting on by default): each source is tee'd into a WAV (`src-tauri/src/recordings`, header flushed every 5 s) and converted to AAC `.m4a` with `/usr/bin/afconvert` when the session ends; leftover WAVs from a crash are repaired and converted at launch. "Refazer transcrição" sends those files to Deepgram's pre-recorded API and replaces the note's segments. The live Deepgram stream retries forever with backoff and keeps a 10-minute backlog; segment times come from an audio-sample clock, not the reconnection time
- LLM calls use the Vercel AI SDK (`src/lib/llm.ts`) with a user-configurable provider (AI Gateway or any OpenAI-compatible endpoint) through `@tauri-apps/plugin-http` — NEVER hardcode a model or provider; ask the user which model to use
- Browser preview: opening `http://localhost:1420` outside Tauri (dev only) installs `src/dev/browser-preview.ts` (mocked IPC + sql.js + demo seed) for UI work and screenshots
- Desktop UI is denser than web: `html { font-size: 15px }` in `src/styles/app.css` scales every rem-based token

## Commits

- Conventional Commits with scope required (e.g., `feat(backend): ...`)

## Releases

- Semantic Release on `main` branch — NOT active yet, will be enabled in CI after v1
- When active: NEVER version manually, commit types drive versioning (`fix` = patch, `feat` = minor, `BREAKING CHANGE` = major)
- CHANGELOG.md will be generated automatically — NEVER edit it by hand
- Config ready in `.releaserc.json`

## Tooling

- ESLint flat config with simple-import-sort
- Prettier with tailwind plugin

## Code Patterns

- DRY (Don't Repeat Yourself) — NEVER repeat code, extract to functions, hooks, or shared packages
- NEVER nest if/else — prefer early returns
- NEVER use comments — code must be self-explanatory (only when extremely necessary)
- ALWAYS move magic numbers to named constants
- Function names MUST be verbs, never nouns
- Methods MUST NOT exceed 50 lines
- Declare variables close to where they are used
- If a function receives more than 2 parameters, use an object parameter

## Naming

- `camelCase` — functions, variables
- `PascalCase` — classes, interfaces, components
- `kebab-case` — files, directories
- `SCREAMING_SNAKE_CASE` — constants

## TypeScript

- Use pnpm as package manager
- Prefer `const` over `let`, never use `var`
- Prefer `interface` over `type` (except for unions)
- Arrow functions, async/await
- NEVER use `any`, `var`, or `enum`
- Zod for runtime validation

## Styling (Web)

- NEVER hardcode colors — ALWAYS use CSS variables from `globals.css` (e.g., `bg-primary`, `text-muted-foreground`)
- If a new color is needed, add it as a CSS variable in `packages/ui/src/styles/globals.css` (both light and dark themes), then reference it via Tailwind
- Gradients MUST be defined as reusable classes in `globals.css` — NEVER inline gradient definitions in components
- This ensures consistency, dark mode support, and easy theme changes across the entire monorepo

## Mobile (React Native + Expo)

- `apps/mobile` runs on Expo + Expo Router, targeting the Apple App Store and Google Play
- File-based routing with Expo Router — screens live under `src/app/`, follow the `kebab-case` file rule
- Route files (`_layout`, screens) are the ONE allowed exception to the no-default-exports rule — Expo Router requires a default export per route
- Route groups mirror the web: `(auth)` for public screens, `(protected)` for authenticated ones; each layout guards its group with `authClient.useSession()`
- Screen components only compose — forms, hooks and logic live under `src/features/<feature>/`
- `process.env` is inlined statically by the bundler — read env vars ONLY through `src/config/env.ts`, NEVER with a computed key
- Start it with `pnpm --filter mobile start` — the app has NO `dev` script on purpose, so Metro stays out of `turbo run dev`
- Metro resolves workspace packages through `watchFolders`; `metro.config.js` falls back to the extensionless path so the monorepo's `.js`-suffixed ESM imports keep working against TypeScript sources

### Styling — NativeWind

- ALWAYS style with [NativeWind](https://www.nativewind.dev/) — Tailwind CSS for React Native via the `className` prop
- Pinned to NativeWind v4 + Tailwind v3 to stay aligned with React Native Reusables — do NOT upgrade to NativeWind v5 / Tailwind v4 without migrating the component layer
- NEVER use `StyleSheet.create` or inline `style={{ ... }}` objects when a Tailwind utility exists; reach for `style` only for the rare dynamic value Tailwind cannot express
- NEVER hardcode colors — use the theme tokens (`bg-primary`, `text-muted-foreground`, etc.)
- Theme tokens mirror the web palette from `packages/ui/src/styles/globals.css`. Adding or changing a color means updating THREE files in `apps/mobile`: `src/global.css` (`:root` + `.dark:root`), `tailwind.config.js` and `src/lib/theme.ts` (`THEME` + `NAV_THEME`)
- Colors that must be passed as props (e.g. `placeholderTextColor`) come from the `useThemeColors()` hook — NEVER from a literal

### Components — React Native Reusables

- ALWAYS build UI from [React Native Reusables](https://reactnativereusables.com/) — the shadcn/ui equivalent for React Native (mobile counterpart to `@workspace/ui` on web)
- Add components with `npx @react-native-reusables/cli@latest add <component>` (config in `components.json`); they land in `src/components/ui/`
- `cn` helper lives in `src/lib/utils.ts`; compose around the generated primitives instead of rewriting them
- NEVER use a raw `<Text>` from `react-native` — ALWAYS the `Text` primitive from `@/components/ui/text`, so theme and variants apply
- Mirror the web component API/naming wherever a screen has a web equivalent, so features stay consistent across platforms

### Authentication

- The auth client lives in `src/lib/auth-client.ts` (`better-auth` + `@better-auth/expo` + `expo-secure-store`), plugins mirroring the backend
- Zod schemas are SHARED with the web app — import from `@workspace/auth/schemas`, NEVER duplicate validation rules in the app
- Validation messages live in `src/features/auth/messages.ts`, screen copy in `src/features/auth/labels.ts` — NEVER hardcode user-facing strings in components
- Backend errors are translated in `src/features/auth/errors.ts` (`throwIfAuthError`) — reuse it instead of reading `result.error` inline
- Password reset on mobile uses the email OTP flow (`emailOtp.sendVerificationOtp` + `emailOtp.resetPassword`), NOT the web link flow — no deep link required
- The app scheme (`APP_SCHEME` in `@workspace/utils`) is registered in the backend's `trustedOrigins` and duplicated in `app.json` (which cannot import TS) — keep both in sync
- `better-auth`, `@better-auth/expo`, `@better-auth/core` and its peers (`@better-fetch/fetch`, `better-call`, `@better-auth/utils`) are pinned to EXACT versions in `apps/mobile`. pnpm resolves unsatisfied peers ignoring `overrides`, and a second copy of `@better-fetch/fetch` makes the `expoClient` plugin fail to type-check — keep them pinned and aligned when upgrading better-auth
- `react` / `react-dom` are pinned to `19.2.3` in the root `pnpm.overrides` because React Native 0.85.3 bundles `react-native-renderer@19.2.3`, which must match `react` EXACTLY at runtime — a newer React throws "Incompatible React versions" on device. The whole monorepo (web included) rides the same version, so bump all three together, driven by the RN version

## Validation

- ALL validations MUST happen on the backend
- Frontend is for presentation only — NEVER rely on frontend for security

## URL State (nuqs)

- Web only — on mobile, route state travels through Expo Router params (`useLocalSearchParams`)
- ALWAYS use nuqs for any URL-driven state (filters, pagination, sorting, tabs)
- NEVER use `useSearchParams()` manually — nuqs handles URL state
- Define typed parsers in `search-params.ts` per feature/route
- Use `createSearchParamsCache` in Server Components to read search params
- Use `useQueryStates` in Client Components to read/write search params
- `NuqsAdapter` MUST be placed in the root layout

## API Client Generation (Orval)

- ALWAYS use Orval to generate API clients from the OpenAPI spec
- Config: React Query + fetch + tags-split (`orval.config.ts` per app)
- Generated output goes to `src/api/endpoints/` and `src/api/model/`
- Use a custom mutator for auth headers
- The spec and the generated client are gitignored — regenerate with `pnpm orval` (the backend must be running)
- Mobile gotcha: Orval's bundled get-tsconfig cannot resolve Expo's exports-based `expo/tsconfig.base`, so mobile runs Orval via `scripts/orval.mjs`, which downloads the spec, swaps in a flat tsconfig during generation and restores the real one afterwards. `pnpm orval` already wraps this — do NOT call the `orval` binary directly in mobile
- NEVER edit generated files — they are overwritten on regeneration
- NEVER create manual query keys or fetch hooks when Orval already generates them for the endpoint
- Endpoints not covered by the OpenAPI spec follow the existing manual pattern
