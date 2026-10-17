"use client";

import { useEffect, useMemo, useState } from "react";
import { loadRecords, saveScreeningIfNew } from "@/lib/account/client";
import { screeningRecordFromFlow, sortByCompletion } from "@/lib/account/screening";
import type { ScreeningRecord, StoredRecord } from "@/lib/account/types";
import { mustShowCrisis } from "@/lib/flow";
import { useAccountRecords } from "@/store/account-store";
import { useFlow, useFlowHydrated } from "@/store/flow-store";

export interface LatestScreening {
  loading: boolean;
  /** The newest finished screening, from this device or the account. */
  latest: ScreeningRecord | null;
  /** Every saved screening in the account, oldest first. */
  history: StoredRecord<"screening">[];
  error: boolean;
}

/**
 * Finds the user's latest screening for tips and history, and saves the
 * device's finished screening into the account when it is not there yet
 * (AK-04 for screenings taken while signed in). A screening whose crisis
 * screen has not been confirmed is never used (K3).
 */
export function useLatestScreening(username: string | null): LatestScreening {
  const hydrated = useFlowHydrated();
  const flow = useFlow();
  const records = useAccountRecords();
  const [error, setError] = useState(false);

  const device = useMemo(
    () => (hydrated && !mustShowCrisis(flow) ? screeningRecordFromFlow(flow) : null),
    [hydrated, flow],
  );

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    (async () => {
      try {
        await loadRecords();
        if (device) await saveScreeningIfNew(device);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, device]);

  const history = useMemo(
    () =>
      sortByCompletion(
        (records ?? []).filter(
          (record): record is StoredRecord<"screening"> => record.kind === "screening",
        ),
      ),
    [records],
  );

  const fromAccount = history.at(-1)?.value ?? null;
  const latest =
    device &&
    (!fromAccount || Date.parse(device.completedAt) >= Date.parse(fromAccount.completedAt))
      ? device
      : fromAccount;

  return {
    loading: !hydrated || (username !== null && records === null && !error),
    latest,
    history,
    error,
  };
}
