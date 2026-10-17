"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FormMessage, PassphraseField, TextField } from "@/components/account/fields";
import { errorCode, useOpenAccount } from "@/components/account/use-account";
import { ArrowRight } from "@/components/icons/arrow-right";
import { ChartLine } from "@/components/icons/chart-line";
import { ClipboardList } from "@/components/icons/clipboard-list";
import { Download } from "@/components/icons/download";
import { KeyRound } from "@/components/icons/key-round";
import { LogIn } from "@/components/icons/log-in";
import { LogOut } from "@/components/icons/log-out";
import { Sparkles } from "@/components/icons/sparkles";
import { Trash } from "@/components/icons/trash";
import { UserRound } from "@/components/icons/user-round";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { changePassphrase, deleteAccount, exportAccount, signOut } from "@/lib/account/client";
import { isAcceptablePassphrase } from "@/lib/account/passphrase";
import { PATHS } from "@/lib/flow";
import { saveFile } from "@/lib/report/client";

/** /akun: the signed-in dashboard and settings, or the way in (AK-05, AK-07–AK-09). */
export function AccountHome() {
  const t = useTranslations("account");
  const username = useOpenAccount();
  const [notice, setNotice] = useState<string | null>(null);

  if (!username) {
    return (
      <div className="mx-auto max-w-2xl space-y-8" data-testid="account-home">
        <header className="space-y-4">
          <h1 className="text-4xl leading-tight sm:text-5xl">{t("title")}</h1>
          <p className="measure text-lg leading-relaxed">{t("homeIntro")}</p>
          <p className="text-sm text-muted-foreground">{t("noEmail")}</p>
        </header>
        {notice ? (
          <FormMessage tone="info" testId="account-notice">
            {notice}
          </FormMessage>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={PATHS.daftar} data-testid="go-sign-up">
              {t("signUp")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={PATHS.masuk} data-testid="go-sign-in">
              <LogIn aria-hidden="true" />
              {t("signIn")}
            </Link>
          </Button>
        </div>
        <p className="text-sm">
          <Link href={PATHS.pulihkan} className="text-primary underline underline-offset-4">
            {t("recover")}
          </Link>
        </p>
      </div>
    );
  }

  const links = [
    {
      href: PATHS.riwayat,
      label: t("linkHistory"),
      icon: ChartLine,
      testId: "account-link-history",
    },
    { href: PATHS.tips, label: t("linkTips"), icon: Sparkles, testId: "account-link-tips" },
    { href: PATHS.rencana, label: t("linkPlan"), icon: ClipboardList, testId: "account-link-plan" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-12" data-testid="account-home">
      <header className="space-y-3">
        <p className="kicker">
          <UserRound aria-hidden="true" className="size-4" />
          <span data-testid="account-username">{username}</span>
        </p>
        <h1 className="text-4xl leading-tight sm:text-5xl">{t("hello", { username })}</h1>
        <p className="measure text-muted-foreground">{t("homeSignedIn")}</p>
      </header>

      <nav aria-label={t("title")}>
        <ul className="grid gap-3 sm:grid-cols-3">
          {links.map(({ href, label, icon: Icon, testId }) => (
            <li key={href}>
              <Link
                href={href}
                data-testid={testId}
                className="surface flex min-h-20 items-center gap-3 p-5 transition-shadow hover:shadow-(--shadow-lift)"
              >
                <Icon aria-hidden="true" className="size-5 shrink-0 text-sage-ink" />
                <span className="font-heading text-lg">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="settings-title" className="space-y-6">
        <h2 id="settings-title" className="text-3xl">
          {t("settingsTitle")}
        </h2>
        <ChangePassphrase />
        <ExportData />
        <DeleteAccount username={username} onDeleted={() => setNotice(t("deleted"))} />
        <Button
          type="button"
          variant="outline"
          data-testid="sign-out"
          onClick={async () => {
            await signOut();
            setNotice(t("signedOut"));
          }}
        >
          <LogOut aria-hidden="true" />
          {t("signOut")}
        </Button>
      </section>
    </div>
  );
}

function ChangePassphrase() {
  const t = useTranslations("account");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<{ busy: boolean; error: string | null; done: boolean }>({
    busy: false,
    error: null,
    done: false,
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state.busy) return;
    if (!isAcceptablePassphrase(next))
      return setState({ busy: false, error: t("weakPassphrase"), done: false });
    if (next !== confirm)
      return setState({ busy: false, error: t("passphraseMismatch"), done: false });
    setState({ busy: true, error: null, done: false });
    try {
      await changePassphrase(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setState({ busy: false, error: null, done: true });
    } catch (caught) {
      setState({ busy: false, error: t(`error.${errorCode(caught)}`), done: false });
    }
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="surface space-y-5 p-6"
      data-testid="change-passphrase"
    >
      <h3 className="flex items-center gap-2.5 text-xl">
        <KeyRound aria-hidden="true" className="size-5 text-sage-ink" />
        {t("changeTitle")}
      </h3>
      <PassphraseField
        label={t("currentPassphraseLabel")}
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        autoComplete="current-password"
        testId="change-current"
      />
      <PassphraseField
        label={t("newPassphraseLabel")}
        hint={t("passphraseHint")}
        value={next}
        onChange={(event) => setNext(event.target.value)}
        autoComplete="new-password"
        showStrength
        testId="change-new"
      />
      <PassphraseField
        label={t("passphraseConfirmLabel")}
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        autoComplete="new-password"
        testId="change-confirm"
      />
      {state.error ? (
        <FormMessage tone="error" testId="change-error">
          {state.error}
        </FormMessage>
      ) : null}
      {state.done ? (
        <FormMessage tone="info" testId="change-done">
          {t("changed")}
        </FormMessage>
      ) : null}
      <Button type="submit" disabled={state.busy} data-testid="change-submit">
        {state.busy ? t("working") : t("changeSubmit")}
      </Button>
    </form>
  );
}

function ExportData() {
  const t = useTranslations("account");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const json = await exportAccount();
      saveFile(
        new TextEncoder().encode(json),
        t("exportFileName", { date: new Date().toISOString().slice(0, 10) }),
        "application/json",
      );
    } catch (caught) {
      setError(t(`error.${errorCode(caught)}`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface space-y-3 p-6">
      <h3 className="flex items-center gap-2.5 text-xl">
        <Download aria-hidden="true" className="size-5 text-sage-ink" />
        {t("exportTitle")}
      </h3>
      <p className="measure text-sm text-muted-foreground">{t("exportBody")}</p>
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={run}
        data-testid="export-data"
      >
        {busy ? t("working") : t("exportSubmit")}
      </Button>
    </div>
  );
}

function DeleteAccount({ username, onDeleted }: { username: string; onDeleted: () => void }) {
  const t = useTranslations("account");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.normalize("NFKC").trim().toLowerCase() === username;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(typed);
      onDeleted();
    } catch (caught) {
      setError(t(`error.${errorCode(caught)}`));
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-4 rounded-2xl border border-destructive/30 bg-card p-6"
      data-testid="delete-account"
    >
      <h3 className="flex items-center gap-2.5 text-xl">
        <Trash aria-hidden="true" className="size-5 text-destructive" />
        {t("deleteTitle")}
      </h3>
      <p className="measure text-sm leading-relaxed">{t("deleteBody")}</p>
      <TextField
        label={t("deleteConfirmLabel", { username })}
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        data-testid="delete-confirm-username"
      />
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <Button
        type="submit"
        variant="destructive"
        disabled={!matches || busy}
        data-testid="delete-account-confirm"
      >
        {busy ? t("working") : t("deleteSubmit")}
      </Button>
    </form>
  );
}
