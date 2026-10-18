<p align="center">
  <img src="public/brand/logo.png" alt="Solace" width="96" />
</p>

<h1 align="center">Solace</h1>

<p align="center"><em>You are not alone.</em></p>

Solace is a mental health screening web app for university students. It runs the 21-item **DASS-21** plus one separate **safety question**, shows results instantly, and then offers two paths: download a report to bring to a psychologist, or sign in (no email) for research-based tips. Available in **Bahasa Indonesia** (default) and **English**.

Built for **TestSprite Hackathon Season 4**. Every pull request gets its own Vercel preview, and the TestSprite GitHub App runs the 34-test suite against that preview; every push to `main` runs it again against production. Blocking PRs (the merge gate) stays off for the first PRs while the suite settles, then gets switched on.

- **Live URL:** https://solace-sc.vercel.app
- **Health check:** https://solace-sc.vercel.app/api/health
- **Test plan and suite coverage:** [TESTING.md](TESTING.md)

## Principles

1. **Safety first.** The safety question and crisis screen come before every result and cannot be skipped.
2. **Evidence-based.** Scoring uses the official DASS-21 cutoffs; every tip cites its source (a DOI or a WHO/NICE guideline).
3. **Independent.** No clinics, private hospitals, or practices are named. The help directory lists only public, government, or nonprofit services.
4. **Private end to end.** No email login, account data encrypted in the browser, no tracking analytics.
5. **Screening, not diagnosis.** Results say "symptoms of … at … level", never "you have …".

## What works today

| Area | Status |
| --- | --- |
| Landing, age check (18+), consent | ✅ |
| DASS-21, one question per screen, progress, back, autosave, keys 1–4 | ✅ |
| Pause and continue later; unfinished answers are deleted after 7 days | ✅ |
| Safety question (PHQ-9 item 9), binary crisis trigger | ✅ |
| Crisis screen: emergency and support numbers by country, breathing, grounding, safety-plan prompts, the user's own plan, confirm to continue | ✅ |
| Crisis gate in the router (`/hasil`, `/laporan`, `/tips`, `/riwayat`) | ✅ |
| Results: 3 cards (text + icon + colour), explanations, disclaimer, priority panel, help directory | ✅ |
| "I need help now", quick exit (button or Esc twice), ID ↔ EN switch without reload | ✅ |
| PDF report for a psychologist: made in the browser, 2 pages (3 with notes), fonts bundled, report language, optional nickname and safety note (`/laporan`) | ✅ |
| Accounts without email: passphrase, recovery kit, sign in/out, 30-minute idle lock, change passphrase, export, delete (`/akun`) | ✅ when a database is configured |
| End-to-end encryption: keys from the passphrase (Argon2id) in the browser; the server stores only ciphertext | ✅ |
| Tips plan by category and severity, each with its source; breathing, grounding, and muscle relaxation toolkit (`/tips`) | ✅ needs an account |
| Six-part safety plan, kept on the device or encrypted in the account, with a PDF (`/rencana-keselamatan`) | ✅ |
| History: trends by category, re-screening reminder after 14 days, worsening warning, daily check-in, past reports (`/riwayat`) | ✅ needs an account |
| Anonymous daily totals for the product goals (no identifiers, nothing during a crisis) | ✅ |
| Content Security Policy and security headers | ✅ |
| Dark mode: follows the system, or pick light or dark with the header switch (remembered on the device); offline screening after the first visit (PWA) | ✅ |
| Health check (`/api/health`) | ✅ |
| Notes for the psychologist: five guided questions in the user's own words, printed as page 3 of the report; kept in the page only (`/laporan`) | ✅ |
| Optional AI tidy-up of those notes (OpenRouter): signed-in users only, after a consent screen, risk check before and after, nothing during a crisis, daily limit | 🟡 Built and tested; stays off until a psychologist reviews the risk-phrase list and `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` are set |

## Safety Contract

These invariants must never break. Each one gets an automated test (Vitest, TestSprite, or both). Once Blocking PRs is switched on in TestSprite, a failing check holds the merge. The scenario for each invariant is in [TESTING.md](TESTING.md).

| # | Invariant | Layer | Test scenario | Status |
| --- | --- | --- | --- | --- |
| K1 | Scores and categories match the official cutoffs | Vitest + TestSprite | Every category boundary; known answer pattern → result cards | ✅ Vitest (`scoring.test.ts`) · ✅ TestSprite (RESU-001, RESU-002, RESU-003) |
| K2 | A safety answer > 0 always opens the crisis screen | TestSprite | Answer 1, 2, 3 → crisis screen before results | ✅ TestSprite (SAFE-001, SAFE-002) · logic in `flow.test.ts` |
| K3 | The crisis screen cannot be skipped | Vitest (`flow.ts`) + TestSprite | Back, refresh, and direct URLs to `/hasil` and `/tips` return to the crisis screen | ✅ Vitest (`flow.test.ts`) · ✅ TestSprite (SAFE-004, SAFE-008) |
| K4 | The crisis gate covers both branches | TestSprite | Download and sign-up branches both pass through the crisis first | ✅ TestSprite (SAFE-005) · logic in `flow.test.ts` |
| K5 | Extremely severe scores show the Priority panel on top | TestSprite | Depression ≥ 28 → professional-help panel before tips | ✅ TestSprite (RESU-003) · logic in `flow.test.ts` |
| K6 | The help directory follows country, not language | TestSprite | EN + Indonesia → Healing119; ID + United Kingdom → Samaritans | ✅ TestSprite (SAFE-006, RESU-004) · data in `content.test.ts` |
| K7 | A disclaimer is always shown before results | TestSprite | Present on the results page and in the PDF | ✅ Results page (TestSprite RESU-005) · ✅ PDF page 1 (Vitest `pdf.test.ts`, `labels.test.ts`) |
| K8 | The PDF shows the same numbers as the results screen | TestSprite | Compare scores and categories on screen vs PDF text | ✅ Vitest (`model.test.ts`, `pdf.test.ts` read the PDF text) · report preview has the same testids for TestSprite |
| K9 | Switching language keeps answers | TestSprite | Switch ID → EN at question 10; answers 1–9 kept | ✅ TestSprite (HOME-002) |
| K10 | Tips match category and severity, each with a DOI source | Vitest (`selectTips`) + TestSprite | Multi-dimension, all normal, severe; every tip card links its source | ✅ Vitest (`tips.test.ts`: all 125 category combinations; every tip links a DOI or WHO/NICE guideline) · ⏳ TestSprite (needs accounts on the preview) |
| K11 | "I need help now" is on every page | TestSprite | Landing, screening, results, tips, history | ✅ TestSprite (HELP-001 to HELP-005) · tips, history, account, and safety-plan pages share the same header |
| P1 | The server only receives ciphertext | TestSprite (API) | `records` payloads and responses contain no answer text or scores | ✅ Vitest (`api.test.ts`: stored rows hold only ciphertext; `keys.test.ts`) · ⏳ TestSprite |
| P2 | No trackers, no commercial referrals | TestSprite | No analytics/ad requests; no CSP violations; every directory entry is public, government, or nonprofit | ✅ Vitest (`security-headers.test.ts`: CSP allows only Solace's origin, no tracker code; directory types in `content.test.ts`) · ⏳ TestSprite |
| P3 | Deleting an account deletes all data | TestSprite (API + UI) | After deletion, sign-in fails and `records` is empty | ✅ Vitest (`api.test.ts`) · ⏳ TestSprite |
| P4 | Recovery kit restores data | Vitest + TestSprite | Sign up → save kit → recover with a new passphrase → history intact | ✅ Vitest (`api.test.ts`, `keys.test.ts`) · ⏳ TestSprite |
| A1 | AI is off by default | TestSprite | New accounts see no AI feature until they accept the consent screen | ✅ Vitest (`notes.test.ts`: off unless switched on, consent first; `risk-check.test.ts`: switched off while the risk list is unreviewed) · ⏳ TestSprite (AI is off on previews) |
| A2 | Risky phrases trigger the crisis screen, not the AI | Vitest (`risk-check.ts`) + TestSprite | Phrases from the test list → crisis screen; AI endpoint not called | ✅ Vitest (`risk-check.test.ts`; `api.test.ts`: a risky note gets `risk_detected` and OpenRouter is never called) · ⏳ the phrase list itself awaits clinical review |
| A3 | AI is unavailable during a crisis | TestSprite | While `crisis_pending`, AI buttons and routes are unreachable | ✅ Vitest (`notes.test.ts`: hidden while a crisis is pending); `/laporan` is behind the crisis gate · ⏳ TestSprite |

✅ done · 🟡 partly done · ⏳ not yet

## Run locally

Requirements: Node.js ≥ 20.9 (CI uses Node 24) and pnpm 12 (`npm install -g pnpm`).

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint         # ESLint
pnpm typecheck    # route types + tsc --noEmit
pnpm test         # Vitest
pnpm build        # production build
pnpm icons        # regenerate app icons from public/brand
```

GitHub Actions runs `lint`, `typecheck`, `test`, and `build` on every push and pull request.

### Accounts and environment variables

The screening, results, PDF, and safety plan work without any server storage. Accounts (and with them tips and history) need a Postgres database; without one, those pages say accounts are not available yet and the API answers `503`.

| Variable | Needed for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Accounts in production and previews | Any managed Postgres (for example through the Vercel Marketplace). Tables are created on first use. |
| `SOLACE_SERVER_SECRET` | Accounts (recommended) | A long random string that keeps decoy salts for unknown usernames stable. Without it, a value derived from `DATABASE_URL` is used. |
| `SOLACE_TEST_RESET_TOKEN` | Optional, previews only | Lets automated tests delete `demo-*` accounts through `POST /api/test/reset`. Never works in production. |
| `SOLACE_LOCAL_DB=pglite` | Optional, local `pnpm start` | Uses an embedded PGlite database in `.data/` instead of Postgres. `pnpm dev` does this automatically. |
| `OPENROUTER_API_KEY` | Optional, AI notes | Server-only key; set a credit limit on it in OpenRouter. AI also needs `OPENROUTER_MODEL` and a reviewed `src/data/risk-phrases.json`; otherwise it stays off. |
| `OPENROUTER_MODEL` | Optional, AI notes | OpenRouter model id, shown to the user on the consent screen. Requests ask for providers that collect no data (`data_collection: "deny"`, `zdr: true`). |

Account pages are prerendered, so set these before building; on Vercel, redeploy after changing them. Keep every value in Vercel's environment settings or a local `.env.local` (ignored by git).

## How it is built

- **Next.js 16** (App Router, Turbopack) + TypeScript strict, **Tailwind CSS 4** with small in-house UI primitives (radio cards, checkbox, button) to stay inside the JavaScript budget
- **next-intl**: `id` (default, unprefixed URLs) and `en` (`/en/...`). The browser language is ignored; only the language switch changes it.
- **Zustand + persist**: screening answers are autosaved in `localStorage` and never leave the device.
- **libsodium** (loaded only when an account is used): Argon2id key derivation and XChaCha20-Poly1305 encryption in the browser. The data key is wrapped twice, by the passphrase and by the recovery key.
- **Drizzle ORM** on Postgres (PGlite locally and in tests). The server keeps an Argon2id hash of a key derived from the passphrase, never the passphrase or the data key.
- **pdf-lib**: reports and the safety plan are made in the browser.
- **Vitest** for pure logic and the API:
  - `src/lib/scoring.ts`: DASS-21 scoring, one cutoff constant
  - `src/lib/flow.ts`: flow state machine and crisis gate
  - `src/lib/tips.ts`: `selectTips`
  - `src/lib/crypto/`: key derivation, wrapping, record encryption
  - `src/server/api.test.ts`: the account API against an in-memory database
  - `src/lib/content.ts`: clinical data and help directory
  - message key parity between `messages/id.json` and `messages/en.json`

**JavaScript budget (PRD 14):** the screening pages (`/mulai`, `/skrining/*`, `/keamanan`, `/krisis`) load under 150 KB of gzipped JavaScript in modern browsers (147.5–149.7 KB; legacy polyfills for old browsers are separate). Encryption, PDF, and animation code load only on the pages that use them.

The crisis decision happens only in the browser. A client-side router guard (`src/components/flow-guard.tsx`) asks `guardRoute()` on every navigation, so back, refresh, and typed URLs cannot reach results while a crisis is pending.

## Clinical content and sources

| Content | Source | Status |
| --- | --- | --- |
| DASS-21, English | Lovibond & Lovibond (1995), [doi:10.1016/0005-7967(94)00075-U](https://doi.org/10.1016/0005-7967(94)00075-U); wording checked against the [official UNSW form](https://www2.psy.unsw.edu.au/dass/) | ✅ Verbatim |
| DASS-21, Indonesian | Ifdil et al. (2022), [doi:10.23916/0020200536840](https://doi.org/10.23916/0020200536840) | ⏳ Waiting for the translator's written permission (placeholders shown) |
| Safety question, English | PHQ-9 item 9, [official form](https://www.phqscreeners.com/) | ✅ Verbatim |
| Safety question, Indonesian | Validated Indonesian PHQ-9 | ⏳ Placeholder |
| Help directory | Indonesia, United States, United Kingdom (`src/data/hotlines.json`) | ⏳ Every entry must be re-verified (`verifiedAt` is empty) |
| Tips (`src/data/tips.json`) | Each tip cites a DOI or a WHO/NICE guideline, checked against Crossref and the publishers' pages | ⏳ Evidence summaries and the reviewer are `TODO(verify)`; the app shows "review pending" until they are filled |
| Toolkit and safety-plan prompts | Breathing, grounding, muscle relaxation, and the six safety-plan sections | ⏳ Wording to be reviewed by a psychologist |
| Risk phrases for the AI check (`src/data/risk-phrases.json`) | Indonesian and English phrases that send the user to the crisis screen instead of the AI (PRD 20.3) | ⏳ `TODO(verify)`: to be written and reviewed by a psychologist; the AI stays off until then |
| Questions for the psychologist notes | Five guided questions (PRD 20.2) | ⏳ Wording to be reviewed by a psychologist |
| Clinical review | Safety question, crisis screen, and flow | ⏳ Reviewer to be named here |

Solace is a screening tool, not a diagnosis.
