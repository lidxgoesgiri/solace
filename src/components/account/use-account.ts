"use client";

import { useEffect } from "react";
import { AccountError, type AccountErrorCode } from "@/lib/account/client";
import { PATHS } from "@/lib/flow";
import { isAccountOpen, touchAccount, useAccountUsername } from "@/store/account-store";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

/**
 * Keeps the signed-in state honest: activity extends it, and after 30 idle
 * minutes the data key is dropped from memory (AK-05). Returns the username
 * while the account is open.
 */
export function useOpenAccount(): string | null {
  const username = useAccountUsername();

  useEffect(() => {
    if (!username) return;
    let last = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - last < 10_000) return;
      last = now;
      if (isAccountOpen(now)) touchAccount(now);
    };
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, onActivity, { passive: true });
    const timer = window.setInterval(() => isAccountOpen(), 60_000);
    return () => {
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, onActivity);
      window.clearInterval(timer);
    };
  }, [username]);

  return username;
}

export function errorCode(error: unknown): AccountErrorCode {
  return error instanceof AccountError ? error.code : "unknown";
}

const NEXT_PATHS = [PATHS.akun, PATHS.tips, PATHS.riwayat, PATHS.rencana] as const;

/** Where to go after signing in: an allowed app path from ?next=, else the account home. */
export function nextPathFromLocation(): string {
  if (typeof window === "undefined") return PATHS.akun;
  const next = new URLSearchParams(window.location.search).get("next");
  return NEXT_PATHS.find((path) => path === next) ?? PATHS.akun;
}
