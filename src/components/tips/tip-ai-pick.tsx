"use client";

import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { ExternalLink } from "@/components/icons/external-link";
import { Sparkles } from "@/components/icons/sparkles";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { hasAiConsent, requestTipPick, saveAiConsent } from "@/lib/ai/client";
import { aiOffer } from "@/lib/ai/notes";
import { containsRiskPhrase } from "@/lib/ai/risk-check";
import { TIP_CONTEXT_MAX_CHARS, TIP_PICK_MAX_CANDIDATES, type TipPick } from "@/lib/ai/tip-pick";
import { isLocale } from "@/lib/content";
import { PATHS, mustShowCrisis } from "@/lib/flow";
import type { Tip } from "@/lib/tips";
import { useFlow, useFlowDispatch } from "@/store/flow-store";

interface TipAiPickProps {
  /** The tip that did not help. */
  tip: Tip;
  /** Library tips that may take its place (`alternativesFor`). */
  candidates: Tip[];
  ai: { available: boolean; model: string | null };
  username: string;
  onUse: (replacement: Tip) => void;
}

type Status = "idle" | "consent" | "form" | "working" | "limited" | "busy" | "error";

/**
 * "Choose with AI" for a tip that did not help (PRD 20.2, AI-05): the AI
 * picks one of the library candidates and rewords its steps for one
 * optional sentence of context. Hidden unless the AI is switched on; asks
 * for consent first (A1); risky words open the crisis screen instead (A2);
 * never during a crisis (A3). Sources come from the library, not the AI.
 */
export function TipAiPick({ tip, candidates, ai, username, onUse }: TipAiPickProps) {
  const t = useTranslations("tips.ai");
  const tips = useTranslations("tips");
  const common = useTranslations("common");
  const appLocale = useLocale();
  const locale = isLocale(appLocale) ? appLocale : "id";
  const id = useId();
  const flow = useFlow();
  const dispatch = useFlowDispatch();
  const pathname = usePathname();
  const router = useRouter();
  const [consented, setConsented] = useState(() => hasAiConsent(username));
  const [status, setStatus] = useState<Status>("idle");
  const [context, setContext] = useState("");
  const [pick, setPick] = useState<TipPick | null>(null);
  const consentHeading = useRef<HTMLHeadingElement>(null);
  const contextInput = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const offer = aiOffer({
    available: ai.available && candidates.length > 0,
    signedIn: true,
    consented: consented && hasAiConsent(username),
    crisisPending: mustShowCrisis(flow),
  });

  useEffect(() => {
    if (status === "consent") consentHeading.current?.focus();
    if (status === "form") contextInput.current?.focus();
  }, [status]);

  useEffect(() => {
    if (pick) resultHeading.current?.focus();
  }, [pick]);

  if (offer !== "consent" && offer !== "ready") return null;

  const openCrisis = () => {
    dispatch({ type: "REQUEST_HELP", from: pathname });
    router.push(PATHS.krisis);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    // A2: the browser checks first, so risky words never leave the device.
    if (context && containsRiskPhrase(context)) {
      openCrisis();
      return;
    }
    setStatus("working");
    const result = await requestTipPick({
      replacedId: tip.id,
      candidates: candidates.slice(0, TIP_PICK_MAX_CANDIDATES).map((candidate) => candidate.id),
      context: context.trim(),
      locale,
    });
    if (result.kind === "risk") {
      openCrisis();
      return;
    }
    if (result.kind === "ok") {
      setPick(result.pick);
      setStatus("idle");
      return;
    }
    setStatus(result.kind === "limited" || result.kind === "busy" ? result.kind : "error");
  };

  const chosen = pick ? candidates.find((candidate) => candidate.id === pick.tipId) : undefined;

  return (
    <div className="space-y-3 border-t border-sky/70 pt-3">
      {pick && chosen ? (
        <div
          role="group"
          aria-labelledby={`${id}-result`}
          className="space-y-3 rounded-2xl border bg-card p-4"
          data-testid={`tip-ai-result-${tip.id}`}
        >
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles aria-hidden="true" className="size-4" />
            {t("resultLabel")}
          </p>
          <h4 id={`${id}-result`} ref={resultHeading} tabIndex={-1} className="text-lg outline-none">
            {chosen.title[locale]}
          </h4>
          <p className="leading-relaxed">{pick.reason}</p>
          <p className="font-semibold">{t("resultSteps")}</p>
          <ol className="list-decimal space-y-1.5 pl-5 leading-relaxed">
            {pick.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="font-medium">{tips("sourcesTitle")}</p>
          <ul className="space-y-1">
            {chosen.evidence.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1.5 underline decoration-ink/30 underline-offset-3 hover:decoration-ink"
                >
                  <ExternalLink aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                  {source.label}
                  <span className="sr-only"> {common("opensInNewTab")}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" size="sm" onClick={() => onUse(chosen)} data-testid={`tip-ai-use-${tip.id}`}>
              {t("use")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setPick(null)}>
              {t("dismiss")}
            </Button>
          </div>
        </div>
      ) : status === "consent" ? (
        <div
          role="group"
          aria-labelledby={`${id}-consent`}
          className="space-y-3 rounded-2xl border bg-card p-4"
          data-testid={`tip-ai-consent-${tip.id}`}
        >
          <h4 id={`${id}-consent`} ref={consentHeading} tabIndex={-1} className="text-lg outline-none">
            {t("consentTitle")}
          </h4>
          <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">
            <li>{t("consentSent")}</li>
            <li>{t("consentNotSent")}</li>
            <li>{t("consentProvider", { model: ai.model ?? "" })}</li>
            <li>
              {t("consentRetention")}{" "}
              <a
                href="https://openrouter.ai/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                {t("consentPolicy")}
              </a>
            </li>
            <li>{t("consentLabel")}</li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                saveAiConsent(username);
                setConsented(true);
                setStatus("form");
              }}
              data-testid={`tip-ai-consent-accept-${tip.id}`}
            >
              {t("accept")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setStatus("idle")}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : status === "form" || status === "working" ? (
        <form onSubmit={submit} className="space-y-2">
          <label htmlFor={`${id}-context`} className="block font-medium">
            {t("contextLabel")}
          </label>
          <input
            id={`${id}-context`}
            ref={contextInput}
            type="text"
            maxLength={TIP_CONTEXT_MAX_CHARS}
            value={context}
            onChange={(event) => setContext(event.target.value)}
            placeholder={t("contextPlaceholder")}
            data-testid={`tip-ai-context-${tip.id}`}
            className="block min-h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base transition-colors hover:border-ink/60"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" size="sm" disabled={status === "working"} data-testid={`tip-ai-submit-${tip.id}`}>
              <Sparkles aria-hidden="true" />
              {status === "working" ? t("working") : t("submit")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setStatus("idle")}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStatus(offer === "consent" ? "consent" : "form")}
            data-testid={`tip-ai-pick-${tip.id}`}
          >
            <Sparkles aria-hidden="true" />
            {t("button")}
          </Button>
          <p className="text-muted-foreground">{t("hint")}</p>
        </div>
      )}
      <p role="status" aria-live="polite" data-testid={`tip-ai-status-${tip.id}`}>
        {status === "limited" ? t("limited") : status === "busy" ? t("busy") : status === "error" ? t("error") : null}
      </p>
    </div>
  );
}
