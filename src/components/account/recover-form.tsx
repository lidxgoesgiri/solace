"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FormMessage, PassphraseField, TextField, fieldValue } from "@/components/account/fields";
import { errorCode } from "@/components/account/use-account";
import { KeyRound } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { recoverAccount } from "@/lib/account/client";
import { isAcceptablePassphrase, passphraseStrength } from "@/lib/account/passphrase";
import { PATHS } from "@/lib/flow";

/** AK-06: recovery code + a new passphrase restore access; data stays intact. */
export function RecoverForm() {
  const t = useTranslations("account");
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passphraseError =
    touched && passphrase.length > 0 && !isAcceptablePassphrase(passphrase)
      ? passphraseStrength(passphrase) === "too_short"
        ? t("passphraseHint")
        : t("weakPassphrase")
      : null;
  const confirmError =
    touched && confirm.length > 0 && confirm !== passphrase ? t("passphraseMismatch") : null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    const form = event.currentTarget;
    const name = fieldValue(form, "recover-username", username);
    const kit = fieldValue(form, "recover-code", code);
    const next = fieldValue(form, "recover-passphrase", passphrase);
    const again = fieldValue(form, "recover-passphrase-confirm", confirm);
    setUsername(name);
    setCode(kit);
    setPassphrase(next);
    setConfirm(again);
    if (busy || !name.trim() || !kit.trim() || !isAcceptablePassphrase(next) || again !== next) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await recoverAccount(name.normalize("NFKC").trim().toLowerCase(), kit, next);
      setPassphrase("");
      setConfirm("");
      router.push(PATHS.akun);
    } catch (caught) {
      const code = errorCode(caught);
      setError(
        code === "invalid_credentials" || code === "invalid_request"
          ? t("error.recovery")
          : t(`error.${code}`),
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6" data-testid="recover-form">
      <TextField
        label={t("usernameLabel")}
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={32}
        required
        data-testid="recover-username"
      />
      <TextField
        label={t("recoverCodeLabel")}
        hint={t("recoverCodeHint")}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="[&_input]:font-mono"
        data-testid="recover-code"
      />
      <PassphraseField
        label={t("newPassphraseLabel")}
        hint={t("passphraseHint")}
        error={passphraseError}
        value={passphrase}
        onChange={(event) => setPassphrase(event.target.value)}
        autoComplete="new-password"
        showStrength
        testId="recover-passphrase"
      />
      <PassphraseField
        label={t("passphraseConfirmLabel")}
        error={confirmError}
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        autoComplete="new-password"
        testId="recover-passphrase-confirm"
      />
      {error ? (
        <FormMessage tone="error" testId="account-error">
          {error}
        </FormMessage>
      ) : null}
      {busy ? <FormMessage tone="info">{t("recovering")}</FormMessage> : null}
      <Button type="submit" size="lg" disabled={busy} data-testid="recover-submit">
        <KeyRound aria-hidden="true" />
        {t("recoverSubmit")}
      </Button>
    </form>
  );
}
