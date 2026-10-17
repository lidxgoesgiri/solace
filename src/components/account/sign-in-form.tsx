"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FormMessage, PassphraseField, TextField } from "@/components/account/fields";
import { errorCode, nextPathFromLocation } from "@/components/account/use-account";
import { LogIn } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { signIn } from "@/lib/account/client";
import { PATHS } from "@/lib/flow";

/** AK-05: sign in with a username and passphrase. */
export function SignInForm() {
  const t = useTranslations("account");
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !username.trim() || !passphrase) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(username.normalize("NFKC").trim().toLowerCase(), passphrase);
      setPassphrase("");
      router.push(nextPathFromLocation());
    } catch (caught) {
      const code = errorCode(caught);
      setError(t(`error.${code === "invalid_request" ? "invalid_credentials" : code}`));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6" data-testid="signin-form">
      <TextField
        label={t("usernameLabel")}
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={32}
        required
        data-testid="signin-username"
      />
      <PassphraseField
        label={t("passphraseLabel")}
        value={passphrase}
        onChange={(event) => setPassphrase(event.target.value)}
        autoComplete="current-password"
        testId="signin-passphrase"
      />
      {error ? (
        <FormMessage tone="error" testId="account-error">
          {error}
        </FormMessage>
      ) : null}
      {busy ? <FormMessage tone="info">{t("signingIn")}</FormMessage> : null}
      <Button type="submit" size="lg" disabled={busy} data-testid="signin-submit">
        <LogIn aria-hidden="true" />
        {t("signIn")}
      </Button>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>
          {t("noAccount")}{" "}
          <Link
            href={PATHS.daftar}
            className="font-medium text-primary underline underline-offset-4"
          >
            {t("signUp")}
          </Link>
        </p>
        <p>
          {t("forgot")}{" "}
          <Link
            href={PATHS.pulihkan}
            className="font-medium text-primary underline underline-offset-4"
          >
            {t("recover")}
          </Link>
        </p>
      </div>
    </form>
  );
}
