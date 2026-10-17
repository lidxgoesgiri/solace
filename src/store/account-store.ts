"use client";

import { create } from "zustand";
import type { StoredRecord } from "@/lib/account/types";

/** The client side of a session also ends after 30 idle minutes (AK-05). */
export const ACCOUNT_IDLE_MS = 30 * 60_000;

interface AccountStore {
  username: string | null;
  /**
   * The decrypted data key lives only in memory: never in localStorage,
   * gone on reload or sign-out (PRD 13.4).
   */
  dataKey: Uint8Array | null;
  /** Decrypted records, loaded once per sign-in. */
  records: StoredRecord[] | null;
  lastActivity: number;
}

const signedOut: AccountStore = { username: null, dataKey: null, records: null, lastActivity: 0 };

export const useAccountStore = create<AccountStore>(() => signedOut);

export function lockAccount() {
  useAccountStore.setState(signedOut);
}

export function touchAccount(now = Date.now()) {
  if (useAccountStore.getState().dataKey) useAccountStore.setState({ lastActivity: now });
}

/** True while signed in and not idle; locks the account when it has been idle too long. */
export function isAccountOpen(now = Date.now()): boolean {
  const { dataKey, lastActivity } = useAccountStore.getState();
  if (!dataKey) return false;
  if (now - lastActivity > ACCOUNT_IDLE_MS) {
    lockAccount();
    return false;
  }
  return true;
}

/** The signed-in username, or null. */
export function useAccountUsername(): string | null {
  return useAccountStore((store) => (store.dataKey ? store.username : null));
}

export function useAccountRecords(): StoredRecord[] | null {
  return useAccountStore((store) => store.records);
}
