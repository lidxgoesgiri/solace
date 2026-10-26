<p align="center">
  <img src="public/brand/logo.png" alt="Solace" width="96" />
</p>

<h1 align="center">Solace</h1>

<p align="center"><em>You are not alone.</em></p>

Solace is a mental health screening web application for university students aged 18 and over. It combines the 21-item Depression Anxiety Stress Scales (**DASS-21**) with a separate safety question, immediate results, a downloadable report for a psychologist, and optional account-based self-help tools.

Screening and report generation work without an account. Users who create an account can keep encrypted screening history, follow source-backed tips, record daily check-ins, and save a safety plan. The interface supports **Bahasa Indonesia** by default and **English**.

**Solace is a screening tool, not a diagnosis.** Clinical review of parts of the content and safety flow remains pending; see [Clinical content and known limitations](#clinical-content-and-known-limitations).

[Live application](https://solace-sc.vercel.app) · [English interface](https://solace-sc.vercel.app/en) · [Privacy policy](https://solace-sc.vercel.app/en/privasi) · [Test plan](TESTING.md)

Originally built for **TestSprite Hackathon Season 4**.

## Contents

- [Key features](#key-features)
- [Technology stack](#technology-stack)
- [System architecture](#system-architecture)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation and setup](#installation-and-setup)
- [Environment configuration](#environment-configuration)
- [Running and building](#running-and-building)
- [Usage guide](#usage-guide)
- [API reference](#api-reference)
- [Testing and quality assurance](#testing-and-quality-assurance)
- [Safety Contract](#safety-contract)
- [Security and privacy](#security-and-privacy)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Development and contributing](#development-and-contributing)
- [Clinical content and known limitations](#clinical-content-and-known-limitations)
- [License and credits](#license-and-credits)

## Key features

| Area | Implemented behavior | Requirements |
| --- | --- | --- |
| Screening | Age and consent checks; 21 questions with progress, back navigation, keyboard shortcuts, autosave, and resume. Unfinished drafts expire after seven days. | Browser storage; no account |
| Safety support | Separate PHQ-9 item 9 safety question; any answer above zero opens crisis support before results. Includes breathing, grounding, safety-plan prompts, and a country-based help directory. | No account |
| Results and reports | Depression, anxiety, and stress scores with severity labels; professional-help panels; browser-generated PDF with optional nickname, safety information, and five guided notes for a psychologist. Report language can differ from interface language. | Completed screening and cleared crisis gate |
| Accounts | Username and passphrase without email; recovery kit, sign-in/out, idle lock, passphrase changes, JSON export, and account deletion. Record contents are encrypted in the browser. | Configured database |
| Tips and history | Tips selected by category and severity from a 13-tip library; source citations, feedback, manual alternatives and restoration; relaxation toolkit, trend charts, past reports, daily mood check-ins, and a 14-day re-screening reminder. | Signed-in account |
| Safety plan | Six sections and a downloadable PDF. Signed-in users can save the plan encrypted; unsigned plans remain in page memory until navigation or reload. | Account required only for saving |
| Optional AI | Tidy the user's psychologist notes; select an eligible alternative library tip with an optional brief reflection; or return a reflection alone in listening mode. Separate consent is required for notes and tips. | Signed-in account, AI configuration, and consent |
| Interface and offline support | ID/EN language switch, system/light/dark themes, reduced-motion support, help and quick-exit controls, and a production service worker for cached screening pages. | Offline use requires a prior online visit and completed caching |

## Technology stack

| Technology | Role |
| --- | --- |
| Next.js 16.4.1, React 19.3, TypeScript | App Router pages, Route Handlers, Turbopack builds, and strict type checking |
| Tailwind CSS 4, in-house UI components, Framer Motion | Styling, controls, and selectively loaded animation |
| next-intl 4 | Indonesian and English routing and compiled messages |
| Zustand 5 | Browser screening state, preferences, and in-memory account state |
| libsodium | Browser Argon2id key derivation and XChaCha20-Poly1305 record encryption |
| Drizzle ORM, postgres, PGlite | PostgreSQL access; embedded PostgreSQL for development and API tests |
| pdf-lib, fontkit | Client-side reports with bundled Inter and Lora fonts |
| OpenRouter | Optional server-side AI requests |
| Vitest 5, Playwright, ESLint 9 | Logic/API tests, rendered browser regressions, and linting |

Dependency ranges and the pinned package manager are defined in [package.json](package.json); [pnpm-lock.yaml](pnpm-lock.yaml) records resolved dependencies.

## System architecture

Solace is a single Next.js application. Localized page shells load interactive browser components, while Route Handlers delegate database and AI work to server modules.

```mermaid
flowchart LR
    Pages["Localized Next.js pages"] --> Flow["Browser flow, scoring, and crisis guard"]
    Flow <--> Drafts[("Browser localStorage")]
    Flow --> PDF["Browser PDF generation"]
    Pages --> Vault["Browser account client and encryption"]
    Vault <-->|"Auth protocol and encrypted records"| API["Next.js Route Handlers"]
    API <--> DB[("PostgreSQL through Drizzle / local PGlite")]
    Pages -->|"Opt-in notes or tip context"| API
    API -->|"Optional AI requests"| OpenRouter["OpenRouter"]
```

- [scoring.ts](src/lib/scoring.ts) sums seven items per DASS-21 subscale and doubles each sum to a score from 0 to 42. Results, reports, and history reuse this logic. The safety answer is separate from these scores.
- [flow.ts](src/lib/flow.ts) defines the screening state machine. [FlowGuard](src/components/flow-guard.tsx) enforces browser navigation rules, including the pending crisis gate on results, reports, tips, and history.
- [The account client](src/lib/account/client.ts) encrypts record contents before API storage. The server retains account and record metadata alongside ciphertext.
- Optional AI is a separate data path: consented notes or tip context reach the Solace server and OpenRouter as readable text. Account-record encryption does not cover these requests.
- Aggregate product events use the same-origin metrics API and require database storage. Screening itself does not require a database.

## Project structure

```text
solace/
├── .github/workflows/ci.yml   # Quality checks and rendered UI tests
├── e2e/                      # Playwright regression scenarios
├── messages/                 # English and Indonesian interface messages
├── public/                   # Brand assets, app icons, and service worker
├── scripts/                  # Asset generation and screening JS budget check
├── src/
│   ├── app/[locale]/         # Localized App Router pages
│   ├── app/api/              # HTTP Route Handlers
│   ├── components/           # Screening, accounts, reports, tips, and toolkit UI
│   ├── data/                 # Instruments, tips, risk phrases, and help directory
│   ├── features/landing/     # Landing-page interactions and visuals
│   ├── hooks/                # Keyboard and motion helpers
│   ├── i18n/                 # Locale routing and message loading
│   ├── lib/                  # Scoring, flow, crypto, reports, and domain logic
│   ├── server/               # API services, schema, database, sessions, and limits
│   ├── store/                # Browser state and persistence
│   └── proxy.ts              # Locale routing proxy
├── TESTING.md                # Safety scenarios and external test history
├── next.config.ts            # Build, localization, and security headers
└── package.json              # Scripts, dependencies, and pnpm version
```

Tests are generally colocated with the modules they verify as `*.test.ts`.

## Prerequisites

- **Node.js 24.x (24.7.0 or later)**, matching CI's major version. Although the manifest declares `>=20.9`, server authentication imports `crypto.argon2` (introduced in Node 24.7), and the installed Vitest toolchain has newer runtime requirements.
- **pnpm 12.11.2**, as pinned in `package.json`.
- **Git** to clone the repository and a modern browser for the interface.
- **PostgreSQL** for hosted account persistence. Local development uses PGlite automatically when `DATABASE_URL` is absent; it does not need a separate database service. CI uses PostgreSQL 17.
- An OpenRouter key only if testing the optional AI features.

## Installation and setup

```bash
git clone https://github.com/lidxgoesgiri/solace.git
cd solace
npm install --global pnpm@12.11.2
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), or [http://localhost:3000/en](http://localhost:3000/en) for English.

No environment file is needed for baseline development. Without an existing `DATABASE_URL`, development accounts use persistent PGlite storage at `.data/pglite`. If an environment file already exists, review its database selection before starting: `DATABASE_URL` always takes precedence over PGlite.

Tables are created with idempotent SQL when the database is first opened. There is no separate migration command or seed step.

## Environment configuration

Create or update `.env.local` in the repository root for local configuration; it is ignored by Git. No `.env.example` is included. Keep credentials in that file or the deployment host's environment settings.

| Variable | Purpose and default |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Takes precedence over embedded storage; needed for hosted accounts, records, and metrics. |
| `SOLACE_LOCAL_DB` | Set to `pglite` to enable embedded storage outside development, such as a local production build. Development enables it automatically when no PostgreSQL URL exists. |
| `SOLACE_PGLITE_DIR` | Optional PGlite storage directory; defaults to `.data/pglite`. |
| `SOLACE_SERVER_SECRET` | Recommended independent random secret for stable decoy salts for unknown usernames. Otherwise derived from `DATABASE_URL`, or a fixed local-development value. |
| `OPENROUTER_API_KEY` | Optional server-only key. AI remains unavailable without it or when the risk-phrase list is not ready. |
| `OPENROUTER_MODEL` | Primary model ID; configured default: `xingchen-agi/xing4.0-29b-a4b:free`. |
| `OPENROUTER_FALLBACK_MODEL` | Fallback model ID; configured default: `nvidia/nemotron-3-ultra-550b-a55b`. Set to `off` to disable fallback. |
| `SOLACE_TEST_RESET_TOKEN` | Optional local/preview automation token for deleting `demo-*` accounts through the reset endpoint. Leave unset on every production host. |

For a hosted database, replace these placeholders with your own values:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/solace"
SOLACE_SERVER_SECRET="replace-with-a-long-random-secret"
```

Use the connection and TLS settings required by your database host. For a local production run with embedded storage instead, omit `DATABASE_URL` and set:

```dotenv
SOLACE_LOCAL_DB=pglite
```

Configure database and AI availability **before building and while running**: pages include these availability flags during prerendering. Rebuild or redeploy after changing them. Next.js manages `NODE_ENV`; Vercel supplies `VERCEL_ENV` and the optional `VERCEL_GIT_COMMIT_SHA` used in the health response.

The model IDs above are source defaults, not confirmation of current provider availability. Requests require strict structured output and the privacy settings described below.

## Running and building

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server on port 3000 |
| `pnpm build` | Create the production build |
| `pnpm start` | Serve an existing production build on port 3000 |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Generate Next.js route types, then run `tsc --noEmit` |
| `pnpm test` | Run Vitest once |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm icons` | Regenerate branded app icons |
| `pnpm report-assets` | Regenerate embedded PDF fonts, logo, and font licenses |
| `pnpm ui-icons` | Regenerate icon components from Lucide assets |

After configuring the desired storage mode, run a local production build with:

```bash
pnpm build
pnpm start
```

A production build/run with neither `DATABASE_URL` nor explicit PGlite mode supports screening and reports but disables accounts, tips, history, and database-backed APIs. Asset generation commands rewrite generated files and are only needed when their source assets change.

## Usage guide

1. Start at `/` or `/en`. Confirm that you are 18 or older and accept consent at `/mulai`.
2. Answer the 21 questions at `/skrining/1` through `/skrining/21`. Keys **1–4** select answer values **0–3**; **Enter** advances. You can go back, pause, switch language, and resume saved answers.
3. Submit the separate safety question at `/keamanan`. Any answer above zero opens `/krisis`; results remain gated until the crisis screen is acknowledged.
4. View the three subscale results at `/hasil`, then open `/laporan` to choose the report language, add optional notes, and download a PDF. Notes remain in page memory and are not saved to the account.
5. Optionally create an account at `/akun/daftar`, save the recovery kit, and use `/tips`, `/riwayat`, and `/rencana-keselamatan`. Use `/akun` to export data, change the passphrase, or delete the account.

English uses the same path names with an `/en` prefix, for example `/en/hasil`. Indonesian is the default; browser language detection is intentionally ignored. Help-directory country selection is independent of interface language.

The header offers help and quick exit. Quick exit, also triggered by pressing **Esc twice within one second**, replaces the current page with Google; it does not erase the browser's full history or saved screening data.

## API reference

Route entry points live in [src/app/api](src/app/api); implementation and validation live in [src/server/api](src/server/api). These are application APIs, with authentication and encryption coordinated by the browser client.

Except for the health check, APIs require configured database storage and otherwise return `503 {"error":"accounts_disabled"}`. Failures use `{"error":"<code>"}`. Authenticated routes use the `solace_session` cookie; requests with an explicitly mismatched origin are rejected for state changes.

| Method and endpoint | Request and response summary | Access |
| --- | --- | --- |
| `GET /api/health` | Returns `status`, `service`, `version`, and ISO `time`; no database probe | Public |
| `POST /api/auth/salt` | `{username}` → `{salt, kdfParams}`; unknown names receive a decoy salt | Public |
| `POST /api/auth/register` | Username, derived authentication/recovery keys, salt, KDF parameters, and wrapped data keys → `201 {username}` and session cookie | Public |
| `POST /api/auth/login` | `{username, authKey}` → `{username, wrappedKeyPassphrase}` and session cookie | Public |
| `POST /api/auth/logout` | Ends the supplied session → `{ok:true}` | Session cookie if present |
| `GET /api/auth/session` | Returns `{username}` and refreshes a valid session | Session |
| `POST /api/auth/recover/start` | `{username, recoveryAuthKey}` → `{wrappedKeyRecovery}` | Recovery credential |
| `POST /api/auth/recover/finish` | Recovery credentials and new passphrase-derived key material → `{username}` and a new session | Recovery credential |
| `POST /api/auth/passphrase` | Current authentication key and replacement passphrase-derived key material → `{ok:true}` | Session and current key |
| `GET /api/records` | Returns `{records:[...]}` containing encrypted records and metadata | Session; own records |
| `POST /api/records` | `{kind, nonce, ciphertext}` → `201 {record}` | Session |
| `PUT /api/records/:id` | `{nonce, ciphertext}` → `{record}` | Session; own record |
| `DELETE /api/records/:id` | Deletes an owned record → `{ok:true}` | Session; own record |
| `DELETE /api/account` | `{confirmUsername}` → `{ok:true}`; cascades to records and sessions | Session |
| `POST /api/ai/notes` | `{answers:[five strings], consent}` → `{answers:[five strings]}` | Session, AI enabled, notes consent |
| `POST /api/ai/tips` | `{replacedId, candidates, context, locale, mode?, consent}` → eligible `tipId`, `reflection`, or both, depending on mode/context | Session, AI enabled, tips consent |
| `POST /api/metrics` | `{event}` → `204` for an accepted aggregate event | Public |
| `GET /api/metrics` | Returns `{metrics:[{day,event,count}]}`, up to 500 recent rows | Public |
| `POST /api/test/reset` | Deletes `demo-*` accounts → `{deleted:number}` | Matching `x-solace-test-token`; local/preview use only |

Record kinds are `screening`, `safety_plan`, `checkin`, and `tip_progress`. Use [the account client](src/lib/account/client.ts) and [crypto helpers](src/lib/crypto/keys.ts) to construct encrypted payloads; never submit a plaintext passphrase, screening answers, or scores as a record body. Records expose IDs, kind, timestamps, nonce, and ciphertext.

AI consent is `{version, feature, model}` and is validated against the current feature and configured primary/fallback model descriptor. Build it with [the consent helpers](src/lib/ai/consent.ts). Tips support `mode: "tip"` (default) and `mode: "listen"`; listening requires context and returns a reflection without a tip. Exact request limits and validation are in [notes.ts](src/lib/ai/notes.ts), [tip-pick.ts](src/lib/ai/tip-pick.ts), and [validate.ts](src/server/validate.ts).

Example health request:

```bash
curl http://localhost:3000/api/health
```

Example response outside Vercel; `time` varies per request:

```json
{"status":"ok","service":"solace","version":"dev","time":"2026-10-26T00:00:00.000Z"}
```

Common errors include `400 invalid_request`, `401 unauthorized` or `invalid_credentials`, `403 consent_required` or `forbidden_origin`, `413 too_large`, and `429 rate_limited`. AI additionally returns `422 risk_detected`, `502 ai_unavailable`, or `503 ai_disabled` / `ai_busy`. Provider capacity and an account's daily allowance are separate limits; `Retry-After` is supplied where applicable.

## Testing and quality assurance

Run the standard checks with the installed dependencies:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node scripts/check-screening-budget.mjs
```

Vitest covers scoring boundaries, flow and crisis rules, draft expiry, tips, history, cryptography, PDFs, content, message parity, privacy, and server APIs. API tests use in-memory PGlite and mocked AI-provider dependencies; they do not establish live OpenRouter availability.

[GitHub Actions](.github/workflows/ci.yml) runs on every push and pull request: frozen dependency installation, lint, type checking, Vitest, production build, screening JavaScript budget, and Playwright. The budget script checks selected screening/crisis routes in both languages against a strict **150 KiB gzip** limit for modern initial JavaScript.

The rendered suite runs `pnpm exec playwright test` in CI against a production build and ephemeral PostgreSQL 17. It starts its own server on port 3000, uses Chromium, and blocks service workers. It covers selected flows and viewports from 320 to 1440 pixels in both languages and themes, including keyboard interactions, crisis guards, and breathing/reduced-motion behavior. Screenshots and failure traces are uploaded as `ui-evidence` for seven days.

TestSprite is managed separately through its GitHub App against Vercel previews and production. [TESTING.md](TESTING.md) records scenarios, historical findings, and remaining verification work. Test counts and older passing runs are not evidence that a new deployment or AI scenario has passed; consult the report for the matching revision. The repository does not configure the external merge gate.

### What the TestSprite suite covers

The suite was built in the TestSprite 3.0 portal against the live app and runs on every pull request preview and every push to `main`. The portal lists 43 tests; a GitHub-triggered run executes 50, because seven earlier copies that the portal no longer shows still run. On 2026-10-26 the latest result of each of the 43 portal tests was Passed, including real AI replies for notes (RPT-003) and the tip pick (TIPS-007).

| Area | Tests | What they check |
| --- | --- | --- |
| Home and language | HOME-001 to 003 (+ HOME-004, 005) | Start from the landing page, K9 answers kept when switching language at question 10, help from the landing page, `robots.txt`, light/dark theme |
| Start and eligibility | STAR-001 to 005 | Adult start, under-18 guidance and redirect, consent gate, resume card |
| Questionnaire | QST-001 to 005 (+ QST-006) | All-lowest and all-highest runs, safety question before results, back navigation, resume, pause and continue |
| Safety and crisis | SAFE-001 to 008 (+ SAFE-009) | K2 any safety answer above zero opens crisis support, K3 the gate holds on direct URLs, history and reload, K4 both branches, K6 directory by country, continuation after acknowledgement, safety plan without an account |
| Results | RESU-001 to 005 | K1 official cutoffs (all-0, all-1, all-3), K5 priority panel, K6 English hotline, K7 disclaimer |
| Report | RPT-002 (+ RPT-001), RPT-003 | K8 PDF numbers match the results, report language, AI notes with their own consent and revert |
| Help and exit | HELP-001 to 007 | K11 help on every step, quick exit in both languages |
| Tips and account | TIPS-001, 004, 006, 007, 008 (+ TIPS-002, 003) | K10 tips by category, sign-up without email and P3 account deletion, daily check-in, swapping and restoring a tip, A1 consent, real AI tip pick with canonical library content, A2/A3 risky text never reaching the AI |
| Interaction | SOLACE-001, 002, 004 | Keyboard answers 1–4 and Enter, the 4/6 breathing pacer, resync after a hidden tab |

P1 (ciphertext only) and P4 (recovery restores data) are covered by Vitest, not yet by TestSprite. Exact steps, the Safety Contract mapping, and the run history are in [TESTING.md](TESTING.md).

What the suite found along the way:

- **A real bug:** leaving right after age and consent, before question 1, left no way to continue from the landing page (STAR-004, [#1](https://github.com/lidxgoesgiri/solace/pull/1)). Fixed on the same branch, then 34/34.
- **A real gap:** `/robots.txt` returned the "page not found" screen until [#13](https://github.com/lidxgoesgiri/solace/pull/13).
- **Tests, not the app:** several failures came from ambiguous steps, such as answer badges 1–4 versus values 0–3 ([#11](https://github.com/lidxgoesgiri/solace/pull/11)) or a test that opened an old preview URL. The steps were rewritten; the app was unchanged.

## Safety Contract

These identifiers are shared with [TESTING.md](TESTING.md). They describe required behavior; verification status belongs to the corresponding test and deployment report.

| ID | Required behavior |
| --- | --- |
| K1 | DASS-21 scores and severity categories match the implemented cutoff table. |
| K2 | Every safety answer above zero opens crisis support. |
| K3 | Pending crisis support gates results and follow-up navigation. |
| K4 | Both report-download and account/tips paths pass through the safety flow. |
| K5 | Extremely severe depression or anxiety triggers the priority professional-help panel. |
| K6 | Help-directory entries follow the selected country, independently of language. |
| K7 | Results and the PDF include the screening disclaimer. |
| K8 | PDF scores match the results screen. |
| K9 | Changing interface language preserves screening answers. |
| K10 | Tips and manual alternatives fit their category/severity section and retain source citations. |
| K11 | Help remains available throughout the user-facing flow. |
| P1 | Account record contents reach storage encrypted; optional AI text follows its separate consented path. |
| P2 | No third-party trackers or commercial referrals are included. |
| P3 | Account deletion removes its records and sessions. |
| P4 | The recovery kit restores access to encrypted account data. |
| A1 | AI requires explicit, feature-specific consent. |
| A2 | Matching risky input opens the crisis flow instead of invoking the AI provider. |
| A3 | The interface hides or blocks AI while a crisis is pending. |

The crisis gate is browser behavior, not server authorization. AI endpoints independently enforce sessions, consent, limits, and phrase checks; they do not receive the browser's crisis state.

## Security and privacy

- **Local screening:** screening state is persisted in browser `localStorage`; results are computed from its saved answers. This storage is not encrypted by the account vault. Seven-day expiry applies to unfinished drafts, not completed results.
- **Account encryption:** Argon2id derives separate authentication and wrapping keys in the browser. XChaCha20-Poly1305 encrypts record contents with a random data key, wrapped separately for the passphrase and recovery key. Decrypted keys and records remain in memory and are cleared on reload/sign-out; the client locks after 30 idle minutes.
- **Visible metadata:** usernames, authentication/recovery hashes, KDF parameters, wrapped keys, record kinds/timestamps, and session metadata are stored server-side. The passphrase, recovery code, and decrypted data key are not sent to the server.
- **Sessions and access:** tokens are random and stored server-side as hashes. Cookies use `HttpOnly`, `Secure`, and `SameSite=Strict`, with a sliding 30-minute expiry. Record operations enforce ownership; state changes reject explicitly mismatched origins.
- **Limits and headers:** authentication has IP and username limits; AI has per-user limits. IP counters are process-local rather than shared across instances. [Security headers](src/lib/security-headers.ts) include a Content Security Policy and framing restrictions.
- **Aggregate metrics:** the server stores daily counts for screening starts, result/report/tips views, and account creation, without a stored person identifier or crisis event. This is separate from third-party tracking.
- **Optional AI:** consented text is readable by the Solace server and provider. Requests ask for `data_collection: "deny"`, `zdr: true`, and `require_parameters: true`, with strict output schemas. One fallback model may be tried on qualifying provider failures using the same privacy settings. No less-private fallback is configured; provider policies still require independent review.
- **AI safeguards:** input/output phrase checks, constrained library IDs, cancellation, and daily limits are implemented. Notes allow 10 requests and tips 20 per user per 24-hour window. Diagnostics record fixed failure metadata rather than prompts, replies, or keys.
- **Test reset:** keep `SOLACE_TEST_RESET_TOKEN` unset in production. The reset handler explicitly rejects `VERCEL_ENV=production`; a self-hosted production server without that flag must not rely on it as a universal production block.

The in-app privacy policy is available at `/privasi` and `/en/privasi`. Its retention-related numbers are checked against implementation constants by [privacy.test.ts](src/lib/privacy.test.ts).

## Deployment

The existing application is hosted on Vercel. A server deployment must support Next.js Route Handlers and Node 24.7 or newer within the 24.x line; a static-only export cannot provide account or AI APIs.

For Vercel, use the pinned pnpm version, install dependencies, and build with `pnpm build`. Set `DATABASE_URL` and an independent `SOLACE_SERVER_SECRET` for each environment where accounts should work. Set optional AI variables before the build if enabling AI, and redeploy after availability changes. Use managed PostgreSQL for hosted persistence; PGlite is intended for local development and tests.

For a Node server with the same prerequisites and environment configuration, use `pnpm build` followed by `pnpm start`. The database user must be able to create tables and indexes on first use. Use HTTPS for deployed session cookies.

`GET /api/health` checks application responsiveness and reports the deployment's short commit SHA on Vercel; it does **not** validate database connectivity or AI-provider health. CI performs validation; deployment and TestSprite integrations are managed outside the checked-in workflow. No Dockerfile or deployment script is included.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Runtime, Argon2, or Vitest errors on an older Node version | Switch to Node 24.7 or newer within the 24.x line and install dependencies with the pinned pnpm version. |
| Accounts unavailable or `503 accounts_disabled` | Confirm storage was configured at build time and runtime. Development uses PGlite automatically; local `pnpm start` needs `SOLACE_LOCAL_DB=pglite` or `DATABASE_URL`. Rebuild after changing availability. |
| Expected PGlite but PostgreSQL is used | An existing `DATABASE_URL` takes precedence, including values loaded from `.env.local`. |
| Database initialization fails | Check connection/TLS settings or PGlite directory permissions, and ensure the database user can create tables. |
| AI controls are missing or return `ai_disabled` | Check the server key, ready risk list, account sign-in, build-time availability, and separate consent for the requested feature. |
| AI returns `ai_busy`, `rate_limited`, or `ai_unavailable` | Provider capacity, the daily account allowance, and rejected/invalid output are distinct cases. Respect `Retry-After`; notes remain intact and manual tip alternatives remain available. |
| Reloading or opening a results URL returns to crisis support | A pending crisis is intentionally persisted and must be acknowledged through the crisis screen. |
| Offline screening fails during development | The service worker is registered only in production. Visit the built application online and allow precaching to complete first; APIs are never cached. |
| Plan or psychologist notes disappear after leaving the page | Unsigned safety plans and report notes are page-memory only. Download the PDF, or sign in and save the safety plan before leaving. |
| Account locks after inactivity or reload | Decryption keys are memory-only. Sign in again; use the saved recovery kit if the passphrase is lost. |
| Playwright cannot start its server | The production build and configured test database are prerequisites, and port 3000 must be free. The checked-in workflow provisions PostgreSQL and Chromium. |

## Development and contributing

Use TypeScript's strict settings and the `@/*` alias for `src/*`. Keep scoring, flow, and selection rules in their domain modules; keep API entry points thin and perform server work in `src/server`. Update both message catalogs when changing interface text, and preserve the instrument wording and source metadata in `src/data`.

Read [AGENTS.md](AGENTS.md) and the relevant installed Next.js guide under `node_modules/next/dist/docs/` before changing framework behavior. Follow the existing tests and the stable `data-testid` conventions described in [TESTING.md](TESTING.md), especially the distinction between answer values 0–3 and visible badges 1–4.

There is no dedicated `CONTRIBUTING.md`, code of conduct, or security-reporting policy in this checkout. Discuss contribution scope with the repository owner, run the applicable quality checks, and update documentation when behavior or configuration changes. Asset generation and application tests are separate from documentation-only validation.

## Clinical content and known limitations

Source citations and review notes are kept with the content rather than inferred from the interface.

| Content | Source and review status recorded in the repository |
| --- | --- |
| English DASS-21 | [Instrument data](src/data/dass21.en.json) cites Lovibond & Lovibond (1995) and the official UNSW form. Scoring is centralized in `src/lib/scoring.ts`. |
| Indonesian DASS-21 | [Instrument data](src/data/dass21.id.json) uses items selected from Damanik's Indonesian DASS-42 translation. Separate validation of this 21-item selection and psychologist review remain pending. |
| Safety question | [English](src/data/safety-question.en.json) and [Indonesian](src/data/safety-question.id.json) files attribute PHQ-9 item 9. Clinical review of the flow remains required. |
| Tips | [The library](src/data/tips.json) contains DOI or WHO/NICE guideline citations and evidence summaries. Psychologist review is pending. |
| AI risk phrases | [The phrase list](src/data/risk-phrases.json) records project-owner approval, explicitly not clinician review. Deterministic phrase matching is a guard, not a clinical risk assessment. |
| Help directory | [Directory data](src/data/hotlines.json) covers Indonesia, the United States, and the United Kingdom, with source URLs and verification dates. Entries require periodic rechecking. |

Toolkit, safety-plan, crisis-screen, and psychologist-note wording also await clinical review. No clinician is named as a reviewer in the repository.

Other current limits are explicit: offline support covers successfully cached page shells and assets, while accounts and AI require connectivity; browser storage can be cleared or unavailable; local IP limits are not distributed; and provider privacy/availability and external end-to-end passes must be verified against the actual deployment. Unfinished clinical review and pending test scenarios are review work, not shipped guarantees. See [TESTING.md](TESTING.md) for the detailed verification backlog; no dated release roadmap is included.

## License and credits

No project-level `LICENSE` file or license field is currently included. The package is marked `private`; a project license needs confirmation from the owner. Bundled PDF fonts have their own included licenses: [Inter](src/lib/report/licenses/Inter-OFL.txt) and [Lora](src/lib/report/licenses/Lora-OFL.txt).

Created by **[Ida Bagus Giri Krisnabhawa](https://github.com/lidxgoesgiri)**, as credited in the application footer. Repository: [lidxgoesgiri/solace](https://github.com/lidxgoesgiri/solace). A dedicated maintenance or security contact is not documented.

Acknowledgements: the DASS and PHQ instrument authors/translators credited in the data files, the cited tip sources, Inter and Lora, Lucide icons, and the open-source projects listed in the technology stack. TestSprite provides the externally managed browser-testing integration.
