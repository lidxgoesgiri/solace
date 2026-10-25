"use client";

import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { ExternalLink } from "@/components/icons/external-link";
import { Sparkles } from "@/components/icons/sparkles";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioItem } from "@/components/ui/radio-cards";
import { useAiRequest } from "@/components/use-ai-request";
import { usePathname, useRouter } from "@/i18n/navigation";
import { hasAiConsent, requestTipPick, saveAiConsent, tipRecommendation } from "@/lib/ai/client";
import { consentModel } from "@/lib/ai/consent";
import { aiOffer } from "@/lib/ai/notes";
import { containsRiskPhrase } from "@/lib/ai/risk-check";
import { TIP_CONTEXT_MAX_CHARS, TIP_PICK_MAX_CANDIDATES, TIP_PICK_MODES, type TipPick, type TipPickMode } from "@/lib/ai/tip-pick";
import { isLocale } from "@/lib/content";
import { PATHS, mustShowCrisis } from "@/lib/flow";
import type { Tip } from "@/lib/tips";
import { useFlow, useFlowDispatch } from "@/store/flow-store";

interface TipAiPickProps {
  /** The tip that did not help. */
  tip: Tip;
  /** Library tips that may take its place (`alternativesFor`). */
  candidates: Tip[];
  ai: { available: boolean; model: string | null; fallbackModel?: string | null };
  username: string;
  onUse: (replacement: Tip) => void;
}

type Status = "idle" | "consent" | "form" | "working" | "limited" | "busy" | "error";

const modeClass = [
  "inline-flex min-h-11 items-center rounded-full border bg-card px-4 text-sm font-medium",
  "transition-colors duration-(--duration-quick) ease-(--ease-calm) hover:border-primary/50",
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "data-[state=checked]:border-primary data-[state=checked]:bg-secondary",
].join(" ");

/**
 * "Choose with AI" for a tip that did not help (PRD 20.2, AI-05): the AI
 * picks only a candidate ID, never rewrites library text. When the user
 * writes about their situation, the AI reflects it in one or two checked
 * sentences; a user who only wants to be heard gets the reflection and no
 * tip. Hidden unless the AI is switched on; asks
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
  // Consent covers every model a request may reach: the primary and the fallback.
  const consentId = ai.model ? consentModel(ai.model, ai.fallbackModel) : null;
  const [consented, setConsented] = useState(() => hasAiConsent(username, "tips", consentId));
  const [status, setStatus] = useState<Status>("idle");
  const [context, setContext] = useState("");
  const [mode, setMode] = useState<TipPickMode>("tip");
  const [pick, setPick] = useState<TipPick | null>(null);
  const [source, setSource] = useState<"ai" | "deterministic">("ai");
  const consentHeading = useRef<HTMLHeadingElement>(null);
  const contextInput = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const crisisPending = mustShowCrisis(flow);
  const { begin, finish, cancel } = useAiRequest(JSON.stringify([username, consentId, ai.available, crisisPending, tip.id, candidates.map((candidate) => candidate.id)]));

  const offer = aiOffer({
    available: ai.available && candidates.length > 0,
    signedIn: true,
    consented: consented && hasAiConsent(username, "tips", consentId),
    crisisPending,
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
    if (offer !== "ready") {
      setStatus("consent");
      return;
    }
    const controller = begin();
    if (!controller) return;
    controller.signal.addEventListener("abort", () => setStatus("idle"), { once: true });
    // A2: the browser checks first, so risky words never leave the device.
    if (context && containsRiskPhrase(context)) {
      cancel();
      openCrisis();
      return;
    }
    setStatus("working");
    const request = {
      replacedId: tip.id,
      candidates: candidates.slice(0, TIP_PICK_MAX_CANDIDATES).map((candidate) => candidate.id),
      context: context.trim(),
      locale,
      mode,
    };
    const result = await requestTipPick(request, { username, model: consentId, signal: controller.signal });
    finish(controller);
    if (controller.signal.aborted || result.kind === "cancelled") return;
    if (result.kind === "risk") {
      openCrisis();
      return;
    }
    if (result.kind === "ok") {
      setPick(result.pick);
      setSource("ai");
      setStatus("idle");
      return;
    }
    if (result.kind === "consent") {
      setConsented(false);
      setStatus("consent");
      return;
    }
    if (result.kind === "signed_out") {
      setStatus("error");
      return;
    }
    const fallback = tipRecommendation(result, request);
    if (fallback) {
      setPick(fallback.pick);
      setSource(fallback.source);
    }
    setStatus(result.kind === "limited" || result.kind === "busy" ? result.kind : "error");
  };

  const chosen = pick?.tipId ? candidates.find((candidate) => candidate.id === pick.tipId) : undefined;
  const listening = mode === "listen";
  const reflection = pick?.reflection ? (
    <div className="space-y-1.5">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Sparkles aria-hidden="true" className="size-4" />
        {t("reflectionLabel")}
      </p>
      <p className="font-heading text-lg leading-relaxed" data-testid={`tip-ai-reflection-${tip.id}`}>
        {pick.reflection}
      </p>
    </div>
  ) : null;

  return (
    <div className="space-y-3 border-t border-sky/70 pt-3">
      {pick && chosen ? (
        <div
          role="group"
          aria-labelledby={`${id}-result`}
          className="space-y-3 rounded-2xl border bg-card p-4"
          data-testid={`tip-ai-result-${tip.id}`}
          data-source={source}
          data-tip-id={chosen.id}
        >
          {reflection}
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles aria-hidden="true" className="size-4" />
            {source === "ai" ? t("resultLabel") : t("fallbackLabel")}
          </p>
          <h4 id={`${id}-result`} ref={resultHeading} tabIndex={-1} className="text-lg outline-none">
            {chosen.title[locale]}
          </h4>
          <p className="leading-relaxed">{chosen.body[locale]}</p>
          <p className="font-semibold">{t("resultSteps")}</p>
          <ol className="list-decimal space-y-1.5 pl-5 leading-relaxed">
            {chosen.howTo[locale].map((step) => (
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
      ) : pick?.reflection ? (
        <div
          role="group"
          aria-labelledby={`${id}-heard`}
          className="space-y-3 rounded-2xl border bg-card p-4"
          data-testid={`tip-ai-heard-${tip.id}`}
          data-source="ai"
        >
          <h4 id={`${id}-heard`} ref={resultHeading} tabIndex={-1} className="text-lg outline-none">
            {t("heardTitle")}
          </h4>
          {reflection}
          <p className="leading-relaxed text-muted-foreground">{t("heardSupport")}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setPick(null);
                setMode("tip");
                setStatus("form");
              }}
              data-testid={`tip-ai-ask-tip-${tip.id}`}
            >
              {t("askTip")}
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
            {ai.fallbackModel ? <li>{t("consentFallback", { model: ai.fallbackModel })}</li> : null}
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
                if (!consentId) return;
                saveAiConsent(username, "tips", consentId);
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
          <p id={`${id}-mode`} className="font-medium">
            {t("modeLegend")}
          </p>
          <RadioGroup
            value={mode}
            values={TIP_PICK_MODES}
            onValueChange={(next) => setMode(next === "listen" ? "listen" : "tip")}
            aria-labelledby={`${id}-mode`}
            className="flex flex-wrap gap-2 pb-1"
          >
            {TIP_PICK_MODES.map((value) => (
              <RadioItem
                key={value}
                value={value}
                disabled={status === "working"}
                className={modeClass}
                data-testid={`tip-ai-mode-${value}-${tip.id}`}
              >
                {value === "listen" ? t("modeListen") : t("modeTip")}
              </RadioItem>
            ))}
          </RadioGroup>
          <label htmlFor={`${id}-context`} className="block font-medium">
            {listening ? t("contextLabelListen") : t("contextLabel")}
          </label>
          <input
            id={`${id}-context`}
            ref={contextInput}
            type="text"
            maxLength={TIP_CONTEXT_MAX_CHARS}
            value={context}
            required={listening}
            disabled={status === "working"}
            onChange={(event) => setContext(event.target.value)}
            placeholder={t("contextPlaceholder")}
            data-testid={`tip-ai-context-${tip.id}`}
            className="block min-h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base transition-colors hover:border-ink/60"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="submit"
              size="sm"
              disabled={status === "working" || (listening && !context.trim())}
              data-testid={`tip-ai-submit-${tip.id}`}
            >
              <Sparkles aria-hidden="true" />
              {status === "working"
                ? listening ? t("workingListen") : t("working")
                : listening ? t("submitListen") : t("submit")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { cancel(); setStatus("idle"); }} data-testid={`tip-ai-cancel-${tip.id}`}>
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
        {status !== "limited" && status !== "busy" && status !== "error"
          ? null
          : listening
            ? t("listenUnavailable")
            : t(status)}
      </p>
    </div>
  );
}
