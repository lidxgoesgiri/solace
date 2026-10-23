"use client";

import { useCallback, useEffect, useRef } from "react";

/** Synchronous double-click lock; scope changes/unmount cancel pending work. */
export function useAiRequest(scope: string) {
  const pending = useRef<AbortController | null>(null);
  const cancel = useCallback(() => {
    pending.current?.abort();
    pending.current = null;
  }, []);
  useEffect(() => cancel, [scope, cancel]);
  const begin = useCallback(() => {
    if (pending.current) return null;
    const controller = new AbortController();
    pending.current = controller;
    return controller;
  }, []);
  const finish = useCallback((controller: AbortController) => {
    if (pending.current === controller) pending.current = null;
  }, []);
  return { begin, finish, cancel };
}
