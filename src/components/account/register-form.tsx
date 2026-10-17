"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FormMessage, PassphraseField, TextField } from "@/components/account/fields";
import { errorCode } from "@/components/account/use-account";
import { ArrowRight, Check, Download } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useRouter } from "@/i18n/navigation";
import { registerAccount } from "@/lib/account/client";
import { isAcceptablePassphrase, passphraseStrength } from "@/lib/account/passphrase";
import { screeningRecordFromFlow } from "@/lib/account/screening";
import { USERNAME_PATTERN } from "@/lib/account/username";
import { PATHS } from "@/lib/flow";
import { saveFile } from "@/lib/report/client";
import { trackEvent } from "@/lib/metrics-client";
import { useFlowStore } from "@/store/flow-store";

interface Created {
  username: string;
  recoveryCode: string;
  imported: boolean;
}

/** Sign-up (AK-01, AK-03), the one-time recovery kit (AK-02), and the import (AK-04). */
export function RegisterForm() {
  const t = useTranslations("account");
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);

  const normalized = username.normalize("NFKC").trim().toLowerCase();
  const usernameError = touched && !USERNAME_PATTERN.test(normalized) ? t("usernameInvalid") : null;
  const strength = passphraseStrength(passphrase);
  const passphraseError =
    touched && passphrase.length > 0 && !isAcceptablePassphrase(passphrase)
      ? strength === "too_short"
        ? t("passphraseHint")
        : t("weakPassphrase")
      : null;
  const confirmError =
    touched && confirm.length > 0 && confirm !== passphrase ? t("passphraseMismatch") : null;
  const ready =
    USERNAME_PATTERN.test(normalized) &&
    isAcceptablePassphrase(passphrase) &&
    confirm === passphrase &&
    agreed;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const lastScreening = screeningRecordFromFlow(useFlowStore.getState().flow);
      const result = await registerAccount(normalized, passphrase, lastScreening);
      trackEvent("account_created");
      setPassphrase("");
      setConfirm("");
      setCreated({ username: normalized, ...result });
    } catch (caught) {
      setError(t(`error.${errorCode(caught)}`));
    } finally {
      setBusy(false);
    }
  };

  if (created) return <RecoveryKit created={created} onDone={() => router.push(PATHS.akun)} />;

  return (
    <form onSubmit={submit} noValidate className="space-y-6" data-testid="register-form">
      <TextField
        label={t("usernameLabel")}
        hint={t("usernameHint")}
        error={usernameError}
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={32}
        required
        data-testid="register-username"
      />
      <PassphraseField
        label={t("passphraseLabel")}
        hint={t("passphraseHint")}
        error={passphraseError}
        value={passphrase}
        onChange={(event) => setPassphrase(event.target.value)}
        autoComplete="new-password"
        showStrength
        testId="register-passphrase"
      />
      <PassphraseField
        label={t("passphraseConfirmLabel")}
        error={confirmError}
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        autoComplete="new-password"
        testId="register-passphrase-confirm"
      />

      <section
        aria-labelledby="consequence-title"
        className="space-y-3 rounded-2xl border border-sun-edge/60 bg-sun-soft p-5"
        data-testid="register-consequence"
      >
        <h2 id="consequence-title" className="text-xl">
          {t("consequenceTitle")}
        </h2>
        <p className="text-sm leading-relaxed">{t("consequenceBody")}</p>
        <div className="flex items-start gap-3">
          <Checkbox
            id="register-understand"
            data-testid="register-understand"
            checked={agreed}
            onCheckedChange={setAgreed}
            className="mt-0.5"
          />
          <label htmlFor="register-understand" className="text-sm leading-snug font-medium">
            {t("consequenceAgree")}
          </label>
        </div>
      </section>

      {error ? (
        <FormMessage tone="error" testId="account-error">
          {error}
        </FormMessage>
      ) : null}
      {busy ? <FormMessage tone="info">{t("creating")}</FormMessage> : null}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button type="submit" size="lg" disabled={busy || !agreed} data-testid="register-submit">
          {t("signUp")}
          <ArrowRight aria-hidden="true" />
        </Button>
        <p className="text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link
            href={PATHS.masuk}
            className="font-medium text-primary underline underline-offset-4"
          >
            {t("signIn")}
          </Link>
        </p>
      </div>
    </form>
  );
}

function RecoveryKit({ created, onDone }: { created: Created; onDone: () => void }) {
  const t = useTranslations("account");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const download = () => {
    const text = t("kitFile", {
      username: created.username,
      code: created.recoveryCode,
      date: new Date().toISOString().slice(0, 10),
    });
    saveFile(new TextEncoder().encode(text), t("kitFileName"), "text/plain;charset=utf-8");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(created.recoveryCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      aria-labelledby="kit-title"
      className="animate-rise-in space-y-6"
      data-testid="recovery-kit"
    >
      <div className="space-y-3">
        <h2 id="kit-title" className="text-3xl">
          {t("kitTitle")}
        </h2>
        <p className="measure leading-relaxed">{t("kitBody")}</p>
      </div>
      {created.imported ? (
        <FormMessage tone="info" testId="register-imported">
          {t("imported")}
        </FormMessage>
      ) : null}
      <figure className="surface space-y-2 p-5">
        <figcaption className="text-sm font-medium text-muted-foreground">
          {t("kitCodeLabel", { username: created.username })}
        </figcaption>
        <p
          className="font-mono text-lg leading-relaxed tracking-wide break-all select-all"
          data-testid="recovery-code"
        >
          {created.recoveryCode}
        </p>
      </figure>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={download} data-testid="download-recovery-kit">
          <Download aria-hidden="true" />
          {t("kitDownload")}
        </Button>
        <Button type="button" variant="outline" onClick={copy} data-testid="copy-recovery-code">
          {copied ? <Check aria-hidden="true" /> : null}
          {copied ? t("kitCopied") : t("kitCopy")}
        </Button>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox
          id="recovery-kit-saved"
          data-testid="recovery-kit-saved"
          checked={saved}
          onCheckedChange={setSaved}
          className="mt-0.5"
        />
        <label htmlFor="recovery-kit-saved" className="leading-snug font-medium">
          {t("kitSaved")}
        </label>
      </div>
      <Button
        type="button"
        size="lg"
        disabled={!saved}
        onClick={onDone}
        data-testid="recovery-kit-continue"
      >
        {t("kitContinue")}
        <ArrowRight aria-hidden="true" />
      </Button>
    </section>
  );
}
