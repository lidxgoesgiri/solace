# Testing Solace

Solace is tested in two layers:

| Layer | Runs on | Covers |
| --- | --- | --- |
| **Vitest** (`pnpm test`) | GitHub Actions, every push and PR | Pure logic and the API: DASS-21 scoring, the flow state machine and crisis gate, draft expiry, tip selection, history trends, encryption, the account API (on an in-memory PGlite database), the PDFs, the security headers, offline caching, clinical data and the help directory, message key parity, the health check |
| **TestSprite 3.0** | Every PR's Vercel preview, through the TestSprite GitHub App | User behaviour on the live app: the flow, the crisis gate, language, directory, accessibility of key controls |

This file is the scenario plan for the TestSprite suite. Each scenario maps to a Safety Contract invariant (see the README) or a PRD requirement ID.

- **Production:** https://solace-sc.vercel.app
- **PR previews:** `https://solace-git-{branch-slug}-ida-bagus.vercel.app`
- **Health check:** `GET /api/health` → `200 {"status":"ok"}`

## Ground rules for every test

- **Start from a clean state.** Screening answers live in `localStorage` (`solace-flow`, `solace-prefs`), so use a fresh browser context or clear storage first.
- **Use `data-testid`, never item text.** Item wording belongs to the instrument data files and may still change after clinical review.
- **Indonesian is the default** at unprefixed URLs (`/hasil`). English lives under `/en/...`. The browser language is ignored.
- **Keyboard works too.** Keys `1`–`4` select answers 0–3, and `Enter` moves on.
- **Badges show 1–4, values are 0–3.** Each answer button has a number badge that matches its key, so `answer-option-N` and `safety-answer-N` (value N) are the buttons whose badge reads N+1. A test step that picks an answer names all of it, for example "`safety-answer-1` (value 1; the second button, badge "2")". "Safety answer 1" on its own is ambiguous: a test agent may click the button whose badge reads 1, the no-risk answer.

## Shared steps

**Start a screening**
1. Open `/`.
2. Click `start-screening` → URL is `/mulai`.
3. Click `age-adult`, then `consent-checkbox`.
4. Click `begin-screening` → URL is `/skrining/1`.

**Answer all 21 items with value N** (pattern `all-N`)
- For questions 1 to 21: click `answer-option-N` (badge N+1), then `next-question`.
- After question 21 the URL is `/keamanan`.

**Answer the safety question with value S**
- Click `safety-answer-S` (badge S+1), then `safety-submit`.
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
| K7-pdf | Disclaimer in the report | Reach `/hasil` · click `download-report` | On `/laporan`, `report-disclaimer` is visible in the page 1 preview (the PDF page 1 has the same text; see `pdf.test.ts`) |
| K8 | PDF numbers match the results screen | Start · `all-1` · safety 0 · note the three `result-card-*` scores · click `download-report` | On `/laporan`, each `report-score-{subscale}` row has the same `data-score` and `data-severity` as the matching result card, and `data-raw` = score ÷ 2 |
| PDF-01 | PDF made in the browser | On `/laporan` click `download-pdf` | `report-status` names `solace-dass21-YYYY-MM-DD.pdf` and a code like `SOL-XXXX-XXXX`; no network request is made while the PDF is built |
| PDF-opt | Report options | On `/laporan` type a nickname in `report-nickname`, untick `report-include-safety` | `report-nickname-preview` shows the nickname; `report-safety` disappears |
| K9 | Switching language keeps answers | Start · answer questions 1–9 with mixed values · at question 10 click `lang-switch` | URL `/en/skrining/10`; `<html lang="en">`; going back with `prev-question`, each of 1–9 still has its option selected |
| K11 | Help button on every page | Visit `/`, `/mulai`, `/skrining/1`, `/keamanan`, `/krisis`, `/hasil`, `/en`. `/keamanan` and `/hasil` are only reachable through the flow (Start · `all-0`); opened directly in a clean session they redirect to `/mulai` by design | `help-now` visible on each; clicking it opens `/krisis` |

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

### Pause, report language, security, and offline

| ID | Requirement | Steps | Expected |
| --- | --- | --- | --- |
| SK-06 | Pause and continue later | Answer questions 1–4 · on `/skrining/5` click `pause-screening` | Back on `/`; `resume-card` says answers are kept on this device for 7 days; `resume-screening` opens `/skrining/5` with answers 1–4 kept |
| PDF-03 | Report language | Reach `/hasil` in Indonesian · `download-report` · choose English in `report-language` | The `report-preview` content (title, labels, disclaimer) switches to English while the page around it stays Indonesian; `download-pdf` makes an English PDF |
| P2-csp | Only Solace's own origin | Open any page and check the response headers; run a full `all-1` flow | `Content-Security-Policy` has `connect-src 'self'`; no CSP violation in the console; no request leaves the Solace origin |
| Theme | Light and dark mode | Clean session, system in light mode · click `theme-switch` · reload · open `/mulai` · click `theme-switch` again | Dark after the first click and still dark after the reload and on `/mulai` (`<html data-theme="dark">`); the button then reads "Mode terang" / "Light mode". The second click returns to light and to following the system. With the system in dark mode, the page starts dark with no click |
| Privacy | Privacy policy on every page | Click `footer-privacy` | `/privasi` shows `privacy-page` with its sections (`privacy-summary` … `privacy-contact`); the English version is `/en/privasi`. Vitest (`privacy.test.ts`) ties its numbers to the code |
| PWA | Works offline after the first visit | Visit `/` once and wait a few seconds · go offline · Start · `all-0` · safety 0 | Every step loads; `/hasil` shows the three cards. Manual check: TestSprite cannot switch the network off |

### Accounts (needs `DATABASE_URL` on the preview)

Without a database these pages show `accounts-unavailable` (and `/tips` shows `tips-coming-soon`). Test accounts use usernames that start with `demo-`; on previews with `SOLACE_TEST_RESET_TOKEN` set, `POST /api/test/reset` with the `x-solace-test-token` header removes them.

| ID | Requirement | Steps | Expected |
| --- | --- | --- | --- |
| AK-01 | Sign up without email | `/akun/daftar` · fill `register-username` (`demo-…`), `register-passphrase`, `register-passphrase-confirm` (12+ characters, several words) · tick `register-understand` · `register-submit` | `recovery-kit` with a `recovery-code`; `recovery-kit-continue` is disabled until `recovery-kit-saved` is ticked, then opens `/akun` with `account-username` |
| AK-02 | Sign in | Sign out (`sign-out`) · `/akun/masuk` · `signin-username`, `signin-passphrase` · `signin-submit` | `/akun` with `account-username`; a wrong passphrase shows `account-error` and stays on `/akun/masuk` |
| P1 | Server sees only ciphertext | Signed in · finish a screening with `all-1` · open `/riwayat` · watch `POST /api/records` | The request body has only `kind`, `nonce`, `ciphertext`; neither it nor `GET /api/records` contains answers, scores, or category names |
| P3 | Deleting an account deletes everything | On `/akun` type the username in `delete-confirm-username` · `delete-account-confirm` | `delete-account-confirm` stays disabled until the username matches; afterwards `go-sign-up` shows, `GET /api/auth/session` is `401`, and signing in again shows `account-error` |
| P4 | Recovery kit restores data | Sign up and note `recovery-code` · finish a screening · sign out · `/akun/pulihkan` · `recover-username`, `recover-code`, `recover-passphrase`, `recover-passphrase-confirm` · `recover-submit` | Signed in with the new passphrase; `/riwayat` still lists the screening; the old passphrase no longer works |

### Notes for the psychologist and AI (AI-04, A1–A3)

| ID | Requirement | Steps | Expected |
| --- | --- | --- | --- |
| AI-04 | Notes on page 3 | Reach `/laporan` · `notes-open` · type in `notes-since` and `notes-tried` · `download-pdf` | `report-notes-preview` says the notes are on page 3; `report-status` names the PDF; no request is sent while it is built |
| AI-04-off | Notes can be left out | After AI-04, untick `notes-include` | `report-notes-preview` disappears; the PDF is two pages |
| A1 | AI off by default | Reach `/laporan` · `notes-open` | No `notes-ai` button while the AI is switched off; when it is on, `ai-consent` appears before anything is sent |
| A3 | No AI during a crisis | Start · `all-0` · safety 1 (crisis pending) · open `/laporan` | Redirected to `/krisis`; the notes and AI controls are never shown |

### Tips, safety plan, and history

| ID | Requirement | Steps | Expected |
| --- | --- | --- | --- |
| K10-a | Tips match category and severity | Signed in · Start · `all-1` · safety 0 · `continue-to-tips` | `tips-plan` has `tips-group-depression` and `tips-group-anxiety` (moderate), no `tips-group-stress` (normal); every `tip-card-*` has a `tip-source-*` link to doi.org or a WHO/NICE guideline |
| K10-b | All normal | Signed in · Start · `all-0` · safety 0 · `continue-to-tips` | `tips-wellbeing` instead of tip groups |
| K10-c | Severe → professional first | Signed in · Start · `all-2` · safety 0 · `continue-to-tips` | `professional-help` and `tips-companion` appear before the tips |
| TP-02 | Evidence summary on every tip | On `/tips` from K10-a | Every `tip-card-*` has a `tip-summary-*` with one sentence (no "TODO") and a `tip-source-*` link |
| TP-04-swap | A tip that did not help can be swapped | From K10-a: click `tip-tried-ba-small-activity`, then `tip-helpful-ba-small-activity-no`, then `tip-try-another-ba-small-activity` | `tip-card-ba-small-activity` is gone; `tip-card-sleep-routine` is now in `tips-group-depression`, which still has 3 cards; `tips-replaced` lists the old tip |
| TP-04-back | A swapped tip can be brought back | After TP-04-swap click `tip-restore-ba-small-activity` | `tip-card-ba-small-activity` is back in `tips-group-depression`; `tip-card-sleep-routine` is gone; `tips-replaced` disappears |
| A1-tips | AI requires opt-in | After `tip-helpful-…-no` on any tip | With AI disabled, there is no `tip-ai-pick-…`. With AI enabled, the button opens consent and sends nothing until acceptance; manual swaps still work |
| TP-03 | Toolkit | On `/tips` click `pmr-start` | `pmr-status` counts through the steps; `pmr-stop` stops it |
| SP-01 | Safety plan without an account | Clean session · `/rencana-keselamatan` · fill `plan-warningSigns` and `plan-people` · `plan-download` | `plan-local-only` says nothing is stored; there is no `plan-save`; `plan-status` names the PDF, and no request is made while it is built |
| SP-02 | Saved plan on the crisis screen | Signed in · `/rencana-keselamatan` (`plan-in-account`) · fill `plan-coping` · `plan-save` → `plan-status` · Start · `all-0` · safety 1 | `/krisis` shows `crisis-own-plan` with the saved entry |
| RW-02 | Trends | Signed in · two screenings (`all-1`, then `all-2`) · `/riwayat` | `history-table` has two rows; `trend-feedback` shows depression rising; `worsening-warning` names the subscales that became severe |
| RW-04 | Daily check-in | On `/riwayat` click `checkin-mood-3` · `checkin-save` | `checkin-status` confirms; the entry appears in `checkin-recent` |
| K11-new | Help button on the new pages | Visit `/tips`, `/riwayat`, `/akun`, `/rencana-keselamatan` | `help-now` visible on each |

## The suite in the TestSprite portal

The suite was generated in the TestSprite 3.0 portal against https://solace-sc.vercel.app from the plan above, then reviewed by hand: duplicates and tests for features that do not exist yet were removed, two score tests with wrong expectations were corrected to the official cutoffs, and a K9 test was added (34 tests). Eight tests were then written by hand for features added later, for **42 tests**. Seven of them stopped showing in the portal's test list after the 41/41 production run on 2026-10-18, so they were added again with the same steps and new IDs (the ones below). The originals turned out to still run in GitHub-triggered runs (PR #14 ran 49 tests: those seven twice), but they can no longer be opened or edited in the portal. Until TestSprite removes them, a run can include both copies.

| Use case | TestSprite IDs | Covers |
| --- | --- | --- |
| Home & language | HOME-001 to HOME-003, HOME-006, HOME-007 | Landing start button, K9 language switch at question 10, help from the landing page, `robots.txt` (HOME-006), light and dark mode (HOME-007) |
| Start & eligibility | STAR-001 to STAR-005 | LO-04 under 18, LO-05 consent, SK-05 resume card |
| Question flow | QST-001 to QST-005, QST-007 | All-0 and all-3 runs, SK-08 safety question before results, SK-04 back, SK-05 reload, SK-06 pause and continue (QST-007) |
| Safety & crisis | SAFE-001 to SAFE-008, SAFE-010 | K2 safety answers 1–3, K3 URL/back/refresh gate, K4 both branches, K6 directory by country, SP-01 safety plan without an account (SAFE-010) |
| Results | RESU-001 to RESU-005 | K1 scores (all-0, all-1, all-3), K5 priority panel, K6 in English, K7 disclaimer |
| Report | RPT-002 | K8 report numbers match the result cards, PDF-03 report language |
| Help & exit | HELP-001 to HELP-007 | K11 help button on every page, GL-02 quick exit |
| Tips & account | TIPS-001, TIPS-004 to TIPS-006 | K10-a tips by category (TIPS-001), AK-01 sign-up and P3 account deletion (TIPS-004), RW-04 history and daily check-in (TIPS-005), TP-04 swapping a tip that did not help and bringing it back, with TP-02 summaries and A1 for the AI pick (TIPS-006). Each signs up a `demo-…` account and deletes it at the end |
| AI scenarios added 2026-10-21 | TIPS-007, TIPS-008, TIPS-009, RPT-003 | Actual ID-only selection and canonical content/use/restore; risk and crisis gating; simulated invalid/error/limit/timeout/cancel responses; notes-specific opt-in, real tidy-up and revert. Test existence is not evidence of a pass: read the matching deployment/run report. |

Triggers: **Pull Request** (Vercel deployment finished → `https://solace-git-{branch-slug}-ida-bagus.vercel.app`) and **Push** to `main` (production).

### First run (2026-10-17, production)

32 of 34 passed. The two failures are real findings, not flaky tests:

- **TIPS-001** — the tips page is still a placeholder. Expected until the tips feature lands.
- **STAR-004** — after starting a screening (age and consent given) and leaving before answering question 1, the landing page offered no way to continue. Fixed on the same branch: a screening now counts as started once age and consent are confirmed, and the resume card says no question has been answered yet.

### PR #2 run (2026-10-17, preview)

33 of 34 passed, 1 blocked. The Help & exit test "Help link opens crisis support from the safety page" opened `/keamanan` directly in a clean session, and the router guard correctly sent it back to `/mulai`, so the safety page was never reached. The app was right and the test was wrong: the test now starts a screening and answers all 21 items before checking `help-now` on `/keamanan`.

### PR #11, #12 and #13 runs (2026-10-18, previews)

#11 had 28 of 34 passed, 4 failed and 2 blocked. #12 and #13 each had 32 passed, 1 failed and 1 blocked. Every failure came from tests that choose an answer by number:

- **#11, failed:** RESU-002 (`all-1`) and RESU-003 (`all-3`) got scores 0 and 28. SAFE-001 and SAFE-004 ("safety answer 1") showed results instead of the crisis screen.
- **#11, blocked:** SAFE-007, which never reached the crisis screen for the same reason.
- **#12 and #13, failed:** HOME-002 (K9) saw the third button selected after switching to English and expected "option 2". The third button is `answer-option-2`, so the answer had been kept.

RESU-002's run log and the scores show the cause. The agent clicked the button whose badge reads "1" (value 0) for "answer 1", and the badge "3" (value 2) for "option 3". Before #11 the Indonesian answer labels were placeholders with the value in the text ("label jawaban 1"), which hid the problem everywhere except the English page that K9 checks.

The app was right; checked by hand on the #11 preview, `safety-answer-1` opens `/krisis`. The steps were rewritten to name the test id, value, position and badge (see the ground rules). After that, all 10 affected tests passed on production.

The other blocked test, TIPS-001, met the account gate on `/tips`. It now signs up first and deletes its account at the end.

### Production after #13, and PR #14 (2026-10-18 and 19)

- **Production:** before #13, the robots test failed on production because `/robots.txt` answered with the HTML "page not found" screen; a real gap, fixed in #13. After #13 merged, production passed 41 of 41.
- **#11 rerun:** 39 of 41. One failure was the robots test above (#11 did not have the fix yet). The other was the theme test: the agent saw the light and dark modes switch but could not read the `data-theme` attribute. Its re-added version (HOME-007) checks the visible button label instead.
- **#14:** 49 of 49, including TIPS-006 for swapping a tip and the seven hidden originals described above.

## Not yet covered

With `DATABASE_URL` set for Production and Preview, TIPS-001 and TIPS-004 to TIPS-006 cover K10-a, AK-01, P3, RW-04 and TP-04 in TestSprite.

| Invariant | Waiting for |
| --- | --- |
| P1, P4, K10-b/c in TestSprite | Not written yet (Vitest covers them) |
| A1–A3 in TestSprite with AI enabled | TIPS-007/008 and RPT-003 have been added in the portal; their actual preview results are required. Owner-approved phrases and a Vercel key are configured; historical 49/49 runs and mocked CI tests do not establish this new coverage |

### OpenRouter verification (2026-10-20)

- PR #15 preview initially returned HTTP 502 for the notes feature. Its server request now explicitly disables reasoning for the short rewriting task and requests JSON. On preview commit `b5782aa`, the actual notes request returned HTTP 200, displayed its result, and restored the original text on request.
- The tip pick then met an upstream OpenRouter HTTP 429. Treat provider capacity separately from the account's daily limit: return `503 ai_busy` with a bounded `Retry-After`, retain the manual alternative, and do not retry automatically or change model/privacy settings.
- `api.test.ts` checks ZDR, input/output risk checks, bounded JSON requests, provider failures, and sanitized logs. `src/lib/ai/client.test.ts` distinguishes provider capacity, daily limits, authentication, and risk responses for both features.
- Browser verification confirmed consent before any AI request, a risky note opening the crisis screen without an AI request, and the crisis gate surviving reload/direct navigation. Temporary test accounts were deleted.
- These checks do not replace the TestSprite run. Read the actual PR check result; an old credit error or a queued run is not a pass.

### AI hardening: required remote scenarios (2026-10-21)

Implementation and CI tests were updated for selection-only tips. After the owner enabled browser access, four scenarios were created through the existing TestSprite 3.0 portal: **TIPS-007** (real tip selection and canonical content), **TIPS-008** (risk/crisis), **TIPS-009** (remote failure simulations and cancellation), and **RPT-003** (real notes, separate opt-in and revert). The portal lists 46 tests; the existing 42 and seven hidden historical duplicates were not removed. **Creation is not a pass.** Use the actual preview run and failure bundle as evidence.

PR #15 commit `30d7cea` passed GitHub Actions (lint, typecheck, tests, build) and the existing 49-test TestSprite run `44ce2df0-be0a-41ae-b5ad-bdfea0c1bbcc` (49 passed, 0 failed). That run predates these four AI scenarios and does not prove actual AI selection.

The portal's **Save & Run** action immediately uses its `default` environment (`https://solace-sc.vercel.app`). An initial TIPS-007 manual run was started there while saving its deployment-independent steps; it tests the older production build, not PR #15. Do not mistake that result for a preview regression or weaken the success assertion to accommodate it. The new scenarios must run through the GitHub PR trigger against its Vercel preview. All test steps follow the configured run base URL rather than hardcoding a host. Use synthetic `demo-…` accounts, request cleanup even on failure, and never include real notes, keys or cookies in test inputs/failure bundles.

| Scenario | Remote steps and evidence required |
| --- | --- |
| Tips opt-in | Sign in, complete the screening with all-1/safety 0, mark a tip not helpful. Open `tip-ai-pick-*`: no `/api/ai/tips` request before `tip-ai-consent-accept-*`. Decline and verify manual swap still works. Notes consent must not grant tips consent. |
| Actual AI success | Accept tips consent, use an innocuous synthetic context, submit once. Require HTTP 200 `{tipId}` and `tip-ai-result-*` with `data-source="ai"`; record the actual model, deployment SHA and Run ID. A fallback is **not** success. |
| Canonical content | Read `data-tip-id` on the result. Match its title/body/steps/sources exactly to `src/data/tips.json` in the tested commit in ID and EN. Use the tip, then restore it; the plan still satisfies K10. |
| Failures and fallback | In TestSprite's remote browser, if supported, intercept the **Solace API response** to simulate empty/malformed/out-of-candidate JSON, 502, 503 `ai_busy`, 429 `rate_limited`, and a delayed/network-failed response. Require a canonical alternative with `data-source="deterministic"`, a non-AI label, correct error message, working use/close/manual controls and no automatic retries. These simulations prove UI handling, not actual upstream provider behaviour. Do not add production test backdoors. |
| Cancel and duplicate clicks | Submit twice rapidly: at most one request. Cancel through `tip-ai-cancel-*` or `notes-ai-cancel`; no late result replaces content. Navigate away or trigger `help-now` while waiting: no result shown after cancellation/crisis. |
| Notes preserved | Submit synthetic notes after separate notes opt-in. During loading edits are disabled; on failure/cancel originals stay intact. On actual success check five answers, empty fields unchanged, then `notes-ai-revert`. |
| Safety/privacy | Use existing approved risk fixtures: before opt-in no request; after opt-in risk opens `/krisis` without a provider call. Crisis URL/refresh guards remain. Inspect requests: no key, scores, answers, account identifiers in the provider payload; consent metadata stays at Solace. Server-side assertions in CI cover exact ZDR routing and refusing risky/malformed provider output. Never record secret values. |

The expanded `src/server/api.test.ts`, `src/lib/ai/client.test.ts` and `src/lib/ai/tip-pick.test.ts` run only in GitHub Actions, alongside the unchanged Safety Contract suite. No local application tests were run for this change. Match CI, Vercel and bot results to the pushed SHA before reporting verification. Do not trigger duplicate runs while that SHA is pending.
