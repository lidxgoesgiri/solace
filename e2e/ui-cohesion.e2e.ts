import { expect, test, type Page, type TestInfo } from "@playwright/test";

const widths = [320, 375, 768, 1024, 1440];
const locales = ["id", "en"] as const;
type Locale = (typeof locales)[number];
const path = (locale: Locale, route = "") => `${locale === "en" ? "/en" : ""}/${route}`;

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    viewport: window.innerWidth,
  }))).toEqual(expect.objectContaining({ viewport: page.viewportSize()!.width }));
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
  expect(overflow, "No horizontal page overflow").toBeLessThanOrEqual(1);
}

async function capture(page: Page, info: TestInfo, name: string, testId?: string) {
  await noOverflow(page);
  const file = info.outputPath(`${name}.png`);
  if (testId) await page.getByTestId(testId).screenshot({ path: file, animations: "disabled" });
  else await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
  await info.attach(name, { path: file, contentType: "image/png" });
}

async function begin(page: Page, locale: Locale) {
  await page.goto(path(locale, "mulai"));
  await page.getByTestId("age-adult").click();
  await expect(page.getByTestId("begin-screening")).toBeDisabled();
  await page.getByTestId("consent-checkbox").click();
  await page.getByTestId("begin-screening").click();
  await expect(page.getByTestId("screening-question")).toHaveAttribute("data-question", "1");
}

// Treat uncaught client errors, hydration errors and server failures as failures.
// Expected unauthenticated API responses and the deliberate 404 are not 5xx.
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error" && /hydration|hydrating|react error/i.test(message.text())) errors.push(message.text());
  });
  page.on("response", response => {
    if (response.status() >= 500) errors.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  // The assertion is evaluated after the actual test, including its navigations.
  test.info().annotations.push({ type: "runtime-errors", description: "Checked in afterEach" });
  runtimeErrors.set(page, errors);
});
const runtimeErrors = new WeakMap<Page, string[]>();
test.afterEach(async ({ page }) => { expect(runtimeErrors.get(page)).toEqual([]); });

for (const locale of locales) for (const width of widths) {
  test(`${locale} ${width}px: landing interactions and screening layout in both themes`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(path(locale));
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await capture(page, info, "landing-light");

    const first = page.getByTestId("landing-step-understand");
    await first.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("landing-step-answer")).toBeFocused();
    await expect(page.getByTestId("landing-step-answer")).toHaveAttribute("aria-selected", "true");
    await page.getByTestId("landing-step-next-answer").click();
    await expect(page.getByTestId("landing-step-choose")).toBeFocused();
    await expect(page.getByTestId("landing-steps-start")).toHaveAttribute("href", path(locale, "mulai"));
    await page.keyboard.press("Home");
    await expect(first).toBeFocused();

    for (const number of [5, 4, 3, 2, 1]) {
      const step = page.getByTestId(`grounding-step-${number}`);
      await expect(step).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByTestId("grounding-current-step")).toContainText((await step.getAttribute("aria-label"))!);
      await page.getByTestId("grounding-next").click();
    }
    await expect(page.getByTestId("grounding-step-5")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("grounding-step-2").focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("grounding-step-2")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("breathing-vibration")).toHaveAttribute("aria-checked", "false");
    await capture(page, info, "grounding-light", "landing-grounding");
    await capture(page, info, "breathing-light", "landing-breathing");

    await page.getByTestId("theme-switch").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await capture(page, info, "landing-dark");
    await begin(page, locale);
    await expect(page.getByTestId("next-question")).toBeDisabled();
    await capture(page, info, "screening-disabled-dark", "screening-question");
    await page.keyboard.press("2"); // badge 2 = value 1, never value 0
    await expect(page.getByTestId("answer-option-1")).toHaveAttribute("aria-checked", "true");
    await capture(page, info, "screening-selected-dark", "screening-question");
    await page.getByTestId("theme-switch").click();
    await capture(page, info, "screening-selected-light", "screening-question");
    const status = page.getByTestId("screening-save-status");
    const gap = await status.evaluate(el => {
      const icon = el.querySelector("svg")!.getBoundingClientRect();
      const text = el.querySelector("span")!.getBoundingClientRect();
      return text.left - icon.right;
    });
    expect(gap).toBeGreaterThanOrEqual(6);
    expect(gap).toBeLessThanOrEqual(10);
    await page.getByTestId("question-text").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("screening-question")).toHaveAttribute("data-question", "2");
    await page.getByTestId("prev-question").click();
    await expect(page.getByTestId("answer-option-1")).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("pause-screening").click();
    await page.getByTestId("resume-screening").click();
    await expect(page.getByTestId("screening-question")).toBeVisible();
  });
}

// Scroll reveal on the landing page. Playwright counts opacity 0 as visible,
// so the computed opacity is checked instead.
const revealed = ["landing-evidence-intro", "landing-toolkit-intro", "landing-final-cta"] as const;

for (const locale of locales) {
  test(`${locale}: landing sections reveal on scroll and never stay hidden`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(path(locale));
    // The hero and its call to action never wait for a reveal.
    await expect(page.getByTestId("start-screening")).toHaveCSS("opacity", "1");

    for (const id of revealed) {
      const section = page.getByTestId(id);
      await section.scrollIntoViewIfNeeded();
      await expect(section).toHaveCSS("opacity", "1");
    }
    const faqItems = page.getByTestId("landing-faq-list").locator(":scope > *");
    await expect(faqItems).toHaveCount(5);
    await faqItems.first().scrollIntoViewIfNeeded();
    for (const item of await faqItems.all()) await expect(item).toHaveCSS("opacity", "1");

    // Revealed content stays interactive: the FAQ opens and the final call to action leads to the screening.
    const faq = page.getByTestId("landing-faq-diagnosis");
    await faq.locator("summary").click();
    await expect(faq).toHaveAttribute("open", "");
    await expect(page.getByTestId("landing-final-start")).toHaveAttribute("href", path(locale, "mulai"));
    await noOverflow(page);
  });

  test(`${locale}: with reduced motion, landing sections show without scrolling`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(path(locale));
    for (const id of revealed) await expect(page.getByTestId(id)).toHaveCSS("opacity", "1");
    for (const item of await page.getByTestId("landing-faq-list").locator(":scope > *").all()) {
      await expect(item).toHaveCSS("opacity", "1");
    }
    // Keyboard users reach the final call to action without any scroll-triggered wait.
    await page.getByTestId("landing-final-start").focus();
    await expect(page.getByTestId("landing-final-start")).toBeFocused();
    await expect(page.getByTestId("landing-final-cta")).toHaveCSS("opacity", "1");
  });
}

for (const locale of locales) {
  test(`${locale}: real account cards, long username and settings at every width`, async ({ page }, info) => {
    await page.goto(path(locale, "akun/daftar"));
    const username = `demo-ui-${Date.now()}-${locale}-long`;
    const passphrase = "synthetic river paper lantern violet";
    await page.getByTestId("register-username").fill(username);
    await page.getByTestId("register-passphrase").fill(passphrase);
    await page.getByTestId("register-passphrase-confirm").fill(passphrase);
    await page.getByTestId("register-understand").click();
    await page.getByTestId("register-submit").click();
    await expect(page.getByTestId("recovery-kit")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("recovery-kit-continue")).toBeDisabled();
    const download = page.waitForEvent("download");
    await page.getByTestId("download-recovery-kit").click();
    await download;
    await page.getByTestId("recovery-kit-saved").click();
    await page.getByTestId("recovery-kit-continue").click();
    await expect(page.getByTestId("account-username")).toHaveText(username);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ["light", "dark"]) {
        if (await page.locator("html").getAttribute("data-theme") !== theme) await page.getByTestId("theme-switch").click();
        const cards = page.locator('[data-testid^="account-link-"]');
        await expect(cards).toHaveCount(3);
        if (width >= 640) {
          const heights = await cards.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height));
          expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
        }
        await capture(page, info, `account-${width}-${theme}`);
      }
    }
    await page.getByTestId("account-link-history").click();
    await expect(page).toHaveURL(new RegExp(`${path(locale, "riwayat")}$`));
    await page.goBack();
    await page.getByTestId("account-link-plan").click();
    await expect(page.getByTestId("plan-warningSigns")).toBeVisible();
    await page.goBack();
    await page.getByTestId("delete-confirm-username").fill(username);
    await page.getByTestId("delete-account-confirm").click();
    await expect(page.getByTestId("go-sign-up")).toBeVisible();
  });

  test(`${locale}: 4/6 pacer, reduced motion, pending history and results stay safe`, async ({ page }, info) => {
    await page.setViewportSize({ width: locale === "id" ? 375 : 1440, height: 900 });
    await begin(page, locale);
    for (let n = 1; n <= 21; n++) {
      await expect(page.getByTestId("screening-question")).toHaveAttribute("data-question", String(n));
      await page.getByTestId("answer-option-1").click();
      await page.getByTestId("next-question").click();
    }
    await page.getByTestId("safety-answer-1").click();
    await page.getByTestId("safety-submit").click();
    await expect(page.getByTestId("crisis-screen")).toBeVisible();
    await expect(page.getByTestId("crisis-continue")).toBeDisabled();
    // Before scrolling to it, the countdown text must already follow the clock.
    const countdown = page.getByTestId("breathing-countdown");
    await expect(countdown).toBeAttached();
    const offScreenStart = (await countdown.textContent()) ?? "";
    await expect(countdown, "countdown keeps time before the pacer is scrolled into view").not.toHaveText(offScreenStart, { timeout: 3_000 });
    await page.getByTestId("breathing-pacer").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("breathing-vibration")).toHaveAttribute("aria-checked", "false");
    const seen = await page.evaluate(async () => {
      const values = new Set<string>();
      for (let i = 0; i < 56; i++) {
        values.add(`${document.querySelector('[data-testid="breathing-circle"]')?.getAttribute("data-phase")}:${document.querySelector('[data-testid="breathing-countdown"]')?.textContent?.trim()}`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      return [...values];
    });
    expect(seen).toEqual(expect.arrayContaining(["in:4", "in:3", "in:2", "in:1", "out:6", "out:5", "out:4", "out:3", "out:2", "out:1"]));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.getByTestId("breathing-circle")).toHaveAttribute("data-reduced-motion", "true");
    expect(await page.getByTestId("breathing-circle").evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    await capture(page, info, "crisis-calm", "crisis-calm");
    await page.goto(path(locale, "hasil%60"));
    await expect(page.getByTestId("crisis-screen")).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId("crisis-screen")).toBeVisible();
    await page.goForward();
    await expect(page.getByTestId("crisis-screen")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("crisis-screen")).toBeVisible();
    await expect(page.getByTestId("result-card-depression")).toHaveCount(0);
    await page.getByTestId("crisis-ack").click();
    await page.getByTestId("crisis-continue").click();
    for (const subscale of ["depression", "anxiety", "stress"]) await expect(page.getByTestId(`result-card-${subscale}`)).toHaveAttribute("data-score", "14");
    await capture(page, info, "results");
    await page.goto(path(locale, "unknown-ui-test"));
    await expect(page.getByTestId("crisis-screen")).toHaveCount(0);
    await expect(page.locator("h1")).toContainText(locale === "id" ? "Halaman tidak ditemukan" : "Page not found");
  });
}
