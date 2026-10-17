# Testing Solace

Solace is tested in two layers:

| Layer | Runs on | Covers |
| --- | --- | --- |
| **Vitest** (`pnpm test`) | GitHub Actions, every push and PR | Pure logic: DASS-21 scoring, the flow state machine and crisis gate, clinical data and the help directory, message key parity, the health check |
| **TestSprite 3.0** | Every PR's Vercel preview, through the TestSprite GitHub App | User behaviour on the live app: the flow, the crisis gate, language, directory, accessibility of key controls |

This file is the scenario plan for the TestSprite suite. Each scenario maps to a Safety Contract invariant (see the README) or a PRD requirement ID.

- **Production:** https://solace-sc.vercel.app
- **PR previews:** `https://solace-git-{branch-slug}-ida-bagus.vercel.app`
- **Health check:** `GET /api/health` → `200 {"status":"ok"}`

## Ground rules for every test

- **Start from a clean state.** Screening answers live in `localStorage` (`solace-flow`, `solace-prefs`), so use a fresh browser context or clear storage first.
- **Use `data-testid`, never item text.** The Indonesian DASS-21 items are `TODO(verify)` placeholders until the translator's permission arrives, so their wording will change.
- **Indonesian is the default** at unprefixed URLs (`/hasil`). English lives under `/en/...`. The browser language is ignored.
- **Keyboard works too.** Keys `1`–`4` select answers 0–3, and `Enter` moves on.

## Shared steps

**Start a screening**
1. Open `/`.
2. Click `start-screening` → URL is `/mulai`.
3. Click `age-adult`, then `consent-checkbox`.
4. Click `begin-screening` → URL is `/skrining/1`.

**Answer all 21 items with value N** (pattern `all-N`)
- For questions 1 to 21: click `answer-option-N`, then `next-question`.
- After question 21 the URL is `/keamanan`.

**Answer the safety question with value S**
- Click `safety-answer-S`, then `safety-submit`.
- S = 0 leads to `/hasil`; S = 1, 2, or 3 leads to `/krisis`.

## Answer patterns and expected results

Scores are shown ×2 (0–42). Each `result-card-{subscale}` carries `data-score` and `data-severity`.

| Pattern | Depression | Anxiety | Stress | `priority-panel` |
| --- | --- | --- | --- | --- |
| `all-0` | 0 · normal | 0 · normal | 0 · normal | absent |
| `all-1` | 14 · moderate | 14 · moderate | 14 · normal | absent |
| `all-2` | 28 · extremely_severe | 28 · extremely_severe | 28 · severe | **present** |
| `all-3` | 42 · extremely_severe | 42 · extremely_severe | 42 · extremely_severe | **present** |

`all-1` is deliberately on boundaries: 14 is the lowest moderate depression score, the highest moderate anxiety score, and the highest normal stress score.

## Scenarios

### Safety Contract

| ID | Invariant | Steps | Expected |
| --- | --- | --- | --- |
| K1-a | Scores match official cutoffs | Start · `all-1` · safety 0 | On `/hasil`: depression `data-score=14`, `data-severity=moderate`; anxiety 14 moderate; stress 14 normal |
| K1-b | 〃 | Start · `all-0` · safety 0 | All three cards 0 · normal |
| K1-c | 〃 | Start · `all-3` · safety 0 | All three cards 42 · extremely_severe |
| K2-1, K2-2, K2-3 | Safety > 0 always opens the crisis screen | Start · `all-0` · safety 1 (then 2, then 3) | URL `/krisis`; `crisis-screen` visible; no `result-card-*` on the page |
| K2-ack | Continue needs confirmation | From K2: check `crisis-continue` | Disabled until `crisis-ack` is checked; then it goes to `/hasil` |
| K3-url | The crisis screen cannot be skipped by URL | From K2 (not confirmed): open `/hasil`, `/tips`, `/laporan`, `/riwayat`, `/en/hasil` | Each ends on `/krisis` (or `/en/krisis`); results never render |
| K3-reload | 〃 by refresh | From K2: reload `/krisis`, then open `/hasil` | Still `/krisis` |
| K3-back | 〃 by Back | Confirm the crisis → `/hasil` · click `help-now` · press browser Back | Ends on `/krisis`, not on results |
| K4 | The gate covers both branches | From K2 (not confirmed): open `/laporan` (download branch) and `/tips` (tips branch) | Both redirect to `/krisis`; after confirming, `download-report` opens `/laporan` and `continue-to-tips` opens `/tips` |
| K5 | Extremely severe → Priority panel on top | Start · `all-2` · safety 0 | `priority-panel` visible and placed before `result-card-depression` in the page |
| K5-neg | No panel otherwise | Start · `all-1` · safety 0 | `priority-panel` absent |
| K6-a | Directory follows country, not language | Open `/krisis` · click `lang-switch` (EN) · leave `country-select` on Indonesia | `service-id-healing119` visible |
| K6-b | 〃 | Open `/krisis` in Indonesian · choose United Kingdom in `country-select` | `service-gb-samaritans` visible; it has a `tel:116123` link |
| K7 | Disclaimer before results' actions | Reach `/hasil` | `disclaimer` visible and placed before `download-report` and `continue-to-tips`; `footer-disclaimer` on every page |
| K9 | Switching language keeps answers | Start · answer questions 1–9 with mixed values · at question 10 click `lang-switch` | URL `/en/skrining/10`; `<html lang="en">`; going back with `prev-question`, each of 1–9 still has its option selected |
| K11 | Help button on every page | Visit `/`, `/mulai`, `/skrining/1`, `/keamanan`, `/krisis`, `/hasil`, `/en` | `help-now` visible on each; clicking it opens `/krisis` |

### Global, onboarding, and screening

| ID | Requirement | Steps | Expected |
| --- | --- | --- | --- |
| GL-02 | Quick exit | Click `quick-exit` (or press Esc twice) | Browser leaves Solace for a neutral site |
| GL-03 | Language switch without reload | Click `lang-switch` on any page | Text switches (`help-now` reads "I need help now"); `<html lang>` changes; answers kept |
| GL-04 | Footer disclaimer | Any page | `footer-disclaimer` reads "Solace adalah alat skrining, bukan diagnosis." |
| LO-01 | Hero | Open `/` at 360 px wide | `start-screening` visible without scrolling |
| LO-04 | Under 18 | `/mulai` · click `age-minor` | `under-18-panel` visible with the help directory; no `begin-screening`; `/skrining/1` redirects to `/mulai` |
| LO-05 | Consent required | `/mulai` · click `age-adult` | `begin-screening` disabled until `consent-checkbox` is checked |
| SK-03 | Progress, no timer | On `/skrining/7` | `progress` reads `7 / 21`; `next-question` disabled until an answer is chosen |
| SK-04 | Back keeps answers | Answer question 1 · next · `prev-question` | Question 1 shows the earlier answer selected |
| SK-05 | Autosave | Answer 6 questions · reload | Still on question 7 with answers kept; `/` shows `resume-card` |
| SK-guard | No skipping ahead | With 3 answers, open `/skrining/15` | Redirected to `/skrining/4` |
| SK-08 | Safety question cannot be skipped | Answer all 21 · open `/hasil` directly | Redirected to `/keamanan` |
| HS-06 | Two branch buttons | On `/hasil` | `download-report` and `continue-to-tips` visible |
| Health | Uptime check | `GET /api/health` | `200`, JSON `status: "ok"` |

## The suite in the TestSprite portal

The suite was generated in the TestSprite 3.0 portal against https://solace-sc.vercel.app from the plan above, then reviewed by hand: duplicates and tests for features that do not exist yet were removed, two score tests with wrong expectations were corrected to the official cutoffs, and a K9 test was added. **34 tests** remain.

| Use case | TestSprite IDs | Covers |
| --- | --- | --- |
| Home & language | HOME-001 to HOME-003 | Landing start button, K9 language switch at question 10, help from the landing page |
| Start & eligibility | STAR-001 to STAR-005 | LO-04 under 18, LO-05 consent, SK-05 resume card |
| Question flow | QST-001 to QST-005 | All-0 and all-3 runs, SK-08 safety question before results, SK-04 back, SK-05 reload |
| Safety & crisis | SAFE-001 to SAFE-008 | K2 safety answers 1–3, K3 URL/back/refresh gate, K4 both branches, K6 directory by country |
| Results | RESU-001 to RESU-005 | K1 scores (all-0, all-1, all-3), K5 priority panel, K6 in English, K7 disclaimer |
| Help & exit | HELP-001 to HELP-007 | K11 help button on every page, GL-02 quick exit |
| Tips | TIPS-001 | Tips branch (waits for the tips feature) |

Triggers: **Pull Request** (Vercel deployment finished → `https://solace-git-{branch-slug}-ida-bagus.vercel.app`) and **Push** to `main` (production).

### First run (2026-10-17, production)

32 of 34 passed. The two failures are real findings, not flaky tests:

- **TIPS-001** — the tips page is still a placeholder. Expected until the tips feature lands.
- **STAR-004** — after starting a screening (age and consent given) and leaving before answering question 1, the landing page offered no way to continue. Fixed on the same branch: a screening now counts as started once age and consent are confirmed, and the resume card says no question has been answered yet.

## Not yet covered (features still to come)

| Invariant | Waiting for |
| --- | --- |
| K8 (PDF numbers match the screen), K7 in the PDF | PDF report |
| K10 (tips match category and severity, each with a DOI) | Tips |
| P1, P3, P4 (ciphertext only, delete account, recovery kit) | Accounts and encryption |
| P2 (no trackers, no CSP violations) | Content Security Policy |
| A1–A3 (AI off by default, risk check, no AI during a crisis) | AI features (P2) |
