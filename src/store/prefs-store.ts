"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { helpDirectory, isCountry, type Country } from "@/lib/content";

interface PrefsStore {
  /** Country for the help directory; independent of language (DL-01, K6). */
  country: Country;
  setCountry: (country: Country) => void;
}

export const usePrefsStore = create<PrefsStore>()(
  persist(
    (set) => ({
      country: helpDirectory.defaultCountry,
      setCountry: (country) => set({ country }),
    }),
    {
      name: "solace-prefs",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (store) => ({ country: store.country }),
      merge: (persisted, current) => {
        const country = (persisted as { country?: unknown } | undefined)?.country;
        return { ...current, country: isCountry(country) ? country : current.country };
      },
    },
  ),
);

const subscribeToHydration = (callback: () => void) =>
  usePrefsStore.persist.onFinishHydration(callback);

export function usePrefsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToHydration,
    () => usePrefsStore.persist.hasHydrated(),
    () => false,
  );
}
