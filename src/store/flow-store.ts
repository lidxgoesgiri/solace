"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  FLOW_STATE_VERSION,
  createInitialFlowState,
  expireStaleDraft,
  flowReducer,
  sanitizeFlowState,
  type FlowEvent,
  type FlowState,
} from "@/lib/flow";

export const FLOW_STORAGE_KEY = "solace-flow";

interface FlowStore {
  flow: FlowState;
  dispatch: (event: FlowEvent) => void;
}

/**
 * Screening state, autosaved to localStorage (SK-05). All changes go through
 * the pure `flowReducer`, so the crisis gate rules live in one place.
 */
export const useFlowStore = create<FlowStore>()(
  persist(
    (set) => ({
      flow: createInitialFlowState(),
      dispatch: (event) =>
        set((store) => ({ flow: flowReducer(store.flow, event) })),
    }),
    {
      name: FLOW_STORAGE_KEY,
      version: FLOW_STATE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (store) => ({ flow: store.flow }),
      // Stored data is untrusted: rebuild it through the sanitizer, and never
      // let restored data clear a crisis that is already pending in memory.
      merge: (persisted, current) => {
        // A draft untouched for 7 days is dropped (SK-06, PRD 13.4); a
        // pending crisis survives that too.
        const restored = expireStaleDraft(
          sanitizeFlowState((persisted as { flow?: unknown } | undefined)?.flow),
          new Date(),
        );
        const flow =
          current.flow.crisis === "crisis_pending" &&
          restored.crisis !== "crisis_pending"
            ? flowReducer(restored, {
                type: "REQUEST_HELP",
                from: current.flow.crisisReturnTo,
              })
            : restored;
        return { ...current, flow };
      },
    },
  ),
);

const subscribeToHydration = (callback: () => void) =>
  useFlowStore.persist.onFinishHydration(callback);

/**
 * False during server rendering and the first client render, true once the
 * saved screening has been loaded. Read the store only after this is true.
 */
export function useFlowHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToHydration,
    () => useFlowStore.persist.hasHydrated(),
    () => false,
  );
}

export function useFlow(): FlowState {
  return useFlowStore((store) => store.flow);
}

export function useFlowDispatch(): FlowStore["dispatch"] {
  return useFlowStore((store) => store.dispatch);
}
