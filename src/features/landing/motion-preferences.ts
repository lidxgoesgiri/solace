"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(callback: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function subscribeToVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

// A static, readable server render; preferences update live after hydration.
export function useLandingReducedMotion() {
  return useSyncExternalStore(subscribeToMotion, () => window.matchMedia(QUERY).matches, () => true);
}

export function useDocumentVisible() {
  return useSyncExternalStore(subscribeToVisibility, () => !document.hidden, () => true);
}
