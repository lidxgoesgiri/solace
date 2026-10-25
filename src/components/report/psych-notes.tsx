"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { useOpenAccount } from "@/components/account/use-account";
import { Sparkles } from "@/components/icons/sparkles";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAiRequest } from "@/components/use-ai-request";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { hasAiConsent, requestTidyNotes, saveAiConsent } from "@/lib/ai/client";
import { consentModel } from "@/lib/ai/consent";
import { NOTE_MAX_CHARS, NOTE_QUESTIONS, aiOffer, hasNotes, type NoteAnswers } from "@/lib/ai/notes";
import { containsRiskPhrase } from "@/lib/ai/risk-check";
import { PATHS, mustShowCrisis } from "@/lib/flow";
import { useFlow, useFlowDispatch } from "@/store/flow-store";

export interface PsychNotesProps {
  notes: NoteAnswers;
  onNotesChange: (notes: string[]) => void;
  aiAssisted: boolean;
  onAiAssistedChange: (aiAssisted: boolean) => void;
  include: boolean;
  onIncludeChange: (include: boolean) => void;
  ai: { available: boolean; model: string | null; fallbackModel?: string | null };
}

type AiStatus = "idle" | "consent" | "working" | "limited" | "busy" | "error" | "empty";

/**
 * Notes for the psychologist (AI-04): five guided questions answered in
 * the user's own words, printed on page 3 of the report. The optional AI
 * step only tidies the wording, after consent (A1), never during a crisis
 * (A3), and never with text that matches the risk phrases (A2).
 */
export function PsychNotes({
  notes,
  onNotesChange,
  aiAssisted,
  onAiAssistedChange,
  include,
  onIncludeChange,
  ai,
}: PsychNotesProps) {
  const t = useTranslations("report.notes");
  const id = useId();
  const flow = useFlow();
  const dispatch = useFlowDispatch();
  const pathname = usePathname();
  const router = useRouter();
  const username = useOpenAccount();
  // Consent covers every model a request may reach: the primary and the fallback.
  const consentId = ai.model ? consentModel(ai.model, ai.fallbackModel) : null;
  const [consented, setConsented] = useState(() => hasAiConsent(username, "notes", consentId));
  const [status, setStatus] = useState<AiStatus>("idle");
  const [original, setOriginal] = useState<string[] | null>(null);
  const consentHeading = useRef<HTMLHeadingElement>(null);
  const crisisPending = mustShowCrisis(flow);
  const { begin, finish, cancel } = useAiRequest(JSON.stringify([username, consentId, ai.available, crisisPending, notes]));

  const offer = aiOffer({
    available: ai.available,
    signedIn: Boolean(username),
    consented: consented && hasAiConsent(username, "notes", consentId),
    crisisPending,
  });

  useEffect(() => {
    if (status === "consent") consentHeading.current?.focus();
  }, [status]);

  const setNote = (index: number, value: string) => {
    onNotesChange(notes.map((note, i) => (i === index ? value : note)));
  };

  const openCrisis = () => {
    dispatch({ type: "REQUEST_HELP", from: pathname });
    router.push(PATHS.krisis);
  };

  const tidy = async () => {
    if (!username || !ai.available || crisisPending) return;
    const controller = begin();
    if (!controller) return;
    controller.signal.addEventListener("abort", () => setStatus("idle"), { once: true });
    // A2: the browser checks first, so risky words never leave the device.
    if (notes.some((note) => containsRiskPhrase(note)) || containsRiskPhrase(notes.join("\n"))) {
      cancel();
      openCrisis();
      return;
    }
    setStatus("working");
    const result = await requestTidyNotes(notes, { username, model: consentId, signal: controller.signal });
    finish(controller);
    if (controller.signal.aborted || result.kind === "cancelled") return;
    if (result.kind === "risk") {
      openCrisis();
      return;
    }
    if (result.kind === "ok") {
      setOriginal([...notes]);
      onNotesChange(result.answers);
      onAiAssistedChange(true);
      setStatus("idle");
      return;
    }
    if (result.kind === "consent") {
      setConsented(false);
      setStatus("consent");
      return;
    }
    setStatus(result.kind === "limited" || result.kind === "busy" ? result.kind : "error");
  };

  const startAi = () => {
    if (!hasNotes(notes)) {
      setStatus("empty");
      return;
    }
    if (offer === "consent") setStatus("consent");
    else if (offer === "ready") void tidy();
  };

  const acceptConsent = () => {
    if (!username || !consentId) return;
    saveAiConsent(username, "notes", consentId);
    setConsented(true);
    void tidy();
  };

  const revert = () => {
    if (original) onNotesChange(original);
    setOriginal(null);
    onAiAssistedChange(false);
  };

  return (
    <section aria-labelledby={`${id}-title`} className="surface space-y-6 p-6 sm:p-8" data-testid="psych-notes">
      <div className="space-y-2">
        <h2 id={`${id}-title`} className="text-2xl">
          {t("title")}
        </h2>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>

      {NOTE_QUESTIONS.map((question, index) => {
        const value = notes[index] ?? "";
        return (
          <div key={question} className="space-y-1.5">
            <label htmlFor={`${id}-${question}`} className="block text-base font-medium">
              {t(`questions.${question}`)}
            </label>
            <textarea
              id={`${id}-${question}`}
              data-testid={`notes-${question}`}
              rows={3}
              maxLength={NOTE_MAX_CHARS}
              value={value}
              disabled={status === "working"}
              onChange={(event) => setNote(index, event.target.value)}
              aria-describedby={`${id}-${question}-count`}
              className="block w-full resize-y rounded-xl border border-input bg-background px-3.5 py-2.5 text-base leading-relaxed transition-colors hover:border-ink/60"
            />
            <p id={`${id}-${question}-count`} className="text-right text-xs text-muted-foreground">
              {t("count", { count: value.length, max: NOTE_MAX_CHARS })}
            </p>
          </div>
        );
      })}

      <div className="flex items-start gap-3">
        <Checkbox
          id={`${id}-include`}
          data-testid="notes-include"
          checked={include}
          onCheckedChange={(checked) => onIncludeChange(checked === true)}
          aria-describedby={`${id}-include-hint`}
          className="mt-0.5"
        />
        <div className="space-y-1">
          <label htmlFor={`${id}-include`} className="text-base font-medium leading-snug">
            {t("include")}
          </label>
          <p id={`${id}-include-hint`} className="text-sm text-muted-foreground">
            {t("includeHint")}
          </p>
        </div>
      </div>

      {offer === "sign_in" ? (
        <p className="text-sm text-muted-foreground" data-testid="notes-ai-sign-in">
          {t("ai.signIn")}{" "}
          <Link
            href={`${PATHS.masuk}?next=${encodeURIComponent(PATHS.laporan)}`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {t("ai.signInLink")}
          </Link>
        </p>
      ) : null}

      {offer === "consent" || offer === "ready" ? (
        <div className="space-y-3 border-t pt-5">
          {aiAssisted ? (
            <div className="space-y-3 rounded-2xl border border-sage bg-sage-soft p-4 text-sm" data-testid="notes-ai-done">
              <p>{t("ai.done")}</p>
              <Button type="button" variant="outline" size="sm" onClick={revert} data-testid="notes-ai-revert">
                {t("ai.revert")}
              </Button>
            </div>
          ) : status === "consent" ? (
            <div
              role="group"
              aria-labelledby={`${id}-consent-title`}
              className="space-y-3 rounded-2xl border bg-card p-5"
              data-testid="ai-consent"
            >
              <h3 id={`${id}-consent-title`} ref={consentHeading} tabIndex={-1} className="text-xl outline-none">
                {t("ai.consentTitle")}
              </h3>
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
                <li>{t("ai.consentSent")}</li>
                <li>{t("ai.consentNotSent")}</li>
                <li>{t("ai.consentProvider", { model: ai.model ?? "" })}</li>
                {ai.fallbackModel ? <li>{t("ai.consentFallback", { model: ai.fallbackModel })}</li> : null}
                <li>
                  {t("ai.consentRetention")}{" "}
                  <a
                    href="https://openrouter.ai/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4"
                  >
                    {t("ai.consentPolicy")}
                  </a>
                </li>
                <li>{t("ai.consentLabel")}</li>
              </ul>
              <div className="flex flex-wrap gap-3 pt-1">
                <Button type="button" onClick={acceptConsent} data-testid="ai-consent-accept">
                  {t("ai.accept")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setStatus("idle")} data-testid="ai-consent-cancel">
                  {t("ai.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={startAi}
                disabled={status === "working"}
                data-testid="notes-ai"
              >
                <Sparkles aria-hidden="true" />
                {status === "working" ? t("ai.working") : t("ai.button")}
              </Button>
              <p className="text-sm text-muted-foreground">{t("ai.hint")}</p>
              {status === "working" ? (
                <Button type="button" variant="outline" size="sm" onClick={() => { cancel(); setStatus("idle"); }} data-testid="notes-ai-cancel">
                  {t("ai.cancel")}
                </Button>
              ) : null}
            </>
          )}
          <p role="status" aria-live="polite" className="text-sm" data-testid="notes-ai-status">
            {status === "limited" ? t("ai.limited") : status === "busy" ? t("ai.busy") : status === "error" ? t("ai.error") : status === "empty" ? t("ai.empty") : null}
          </p>
        </div>
      ) : null}
    </section>
  );
}
