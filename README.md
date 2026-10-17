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
2. **Evidence-based.** Scoring uses the official DASS-21 cutoffs; every tip will cite a DOI.
3. **Independent.** No clinics, private hospitals, or practices are named. The help directory lists only public, government, or nonprofit services.
4. **Private end to end.** No email login, account data encrypted in the browser, no tracking analytics.
5. **Screening, not diagnosis.** Results say "symptoms of … at … level", never "you have …".

## What works today

| Area | Status |
| --- | --- |
| Landing, age check (18+), consent | ✅ |
| DASS-21, one question per screen, progress, back, autosave, keys 1–4 | ✅ |
| Safety question (PHQ-9 item 9), binary crisis trigger | ✅ |
| Crisis screen: emergency and support numbers by country, breathing, grounding, safety-plan prompts, confirm to continue | ✅ |
| Crisis gate in the router (`/hasil`, `/laporan`, `/tips`, `/riwayat`) | ✅ |
| Results: 3 cards (text + icon + colour), explanations, disclaimer, priority panel, help directory | ✅ |
| "I need help now", quick exit (button or Esc twice), ID ↔ EN switch without reload | ✅ |
| Health check (`/api/health`) | ✅ |
| PDF report, accounts and encryption, tips, safety plan, history, AI | ⏳ Coming in later PRs |

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
| K7 | A disclaimer is always shown before results | TestSprite | Present on the results page and in the PDF | 🟡 Results page ✅ TestSprite (RESU-005) · ⏳ PDF |
| K8 | The PDF shows the same numbers as the results screen | TestSprite | Compare scores and categories on screen vs PDF text | ⏳ PDF not built yet |
| K9 | Switching language keeps answers | TestSprite | Switch ID → EN at question 10; answers 1–9 kept | ✅ TestSprite (HOME-002) |
| K10 | Tips match category and severity, each with a DOI source | Vitest (`selectTips`) + TestSprite | Multi-dimension, all normal, severe; every tip card links its source | ⏳ Tips not built yet |
| K11 | "I need help now" is on every page | TestSprite | Landing, screening, results, tips, history | ✅ TestSprite (HELP-001 to HELP-005) · tips and history pages ⏳ |
| P1 | The server only receives ciphertext | TestSprite (API) | `records` payloads and responses contain no answer text or scores | ⏳ Accounts not built yet |
| P2 | No trackers, no commercial referrals | TestSprite | No analytics/ad requests; no CSP violations; every directory entry is public, government, or nonprofit | 🟡 No trackers; directory types in `content.test.ts` · ⏳ CSP, TestSprite |
| P3 | Deleting an account deletes all data | TestSprite (API + UI) | After deletion, sign-in fails and `records` is empty | ⏳ Accounts not built yet |
| P4 | Recovery kit restores data | Vitest + TestSprite | Sign up → save kit → recover with a new passphrase → history intact | ⏳ Accounts not built yet |
| A1 | AI is off by default | TestSprite | New accounts see no AI feature until they accept the consent screen | ⏳ AI not built yet (P2) |
| A2 | Risky phrases trigger the crisis screen, not the AI | Vitest (`risk-check.ts`) + TestSprite | Phrases from the test list → crisis screen; AI endpoint not called | ⏳ AI not built yet (P2) |
| A3 | AI is unavailable during a crisis | TestSprite | While `crisis_pending`, AI buttons and routes are unreachable | ⏳ AI not built yet (P2) |

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

## How it is built

- **Next.js** (App Router) + TypeScript strict, **Tailwind CSS** + **shadcn/ui** (Radix)
- **next-intl**: `id` (default, unprefixed URLs) and `en` (`/en/...`). The browser language is ignored; only the language switch changes it.
- **Zustand + persist**: screening answers are autosaved in `localStorage` and never leave the device.
- **Vitest** for pure logic:
  - `src/lib/scoring.ts`: DASS-21 scoring, one cutoff constant
  - `src/lib/flow.ts`: flow state machine and crisis gate
  - `src/lib/content.ts`: clinical data and help directory
  - message key parity between `messages/id.json` and `messages/en.json`

The crisis decision happens only in the browser. A client-side router guard (`src/components/flow-guard.tsx`) asks `guardRoute()` on every navigation, so back, refresh, and typed URLs cannot reach results while a crisis is pending.

## Clinical content and sources

| Content | Source | Status |
| --- | --- | --- |
| DASS-21, English | Lovibond & Lovibond (1995), [doi:10.1016/0005-7967(94)00075-U](https://doi.org/10.1016/0005-7967(94)00075-U); wording checked against the [official UNSW form](https://www2.psy.unsw.edu.au/dass/) | ✅ Verbatim |
| DASS-21, Indonesian | Ifdil et al. (2022), [doi:10.23916/0020200536840](https://doi.org/10.23916/0020200536840) | ⏳ Waiting for the translator's written permission (placeholders shown) |
| Safety question, English | PHQ-9 item 9, [official form](https://www.phqscreeners.com/) | ✅ Verbatim |
| Safety question, Indonesian | Validated Indonesian PHQ-9 | ⏳ Placeholder |
| Help directory | Indonesia, United States, United Kingdom (`src/data/hotlines.json`) | ⏳ Every entry must be re-verified (`verifiedAt` is empty) |
| Clinical review | Safety question, crisis screen, and flow | ⏳ Reviewer to be named here |

Solace is a screening tool, not a diagnosis.
