/**
 * Offline support (PRD 14). The pages a screening needs, in one language,
 * are cached ahead of time so the flow keeps working without a connection.
 * Results, the report preview, and account pages are not cached ahead:
 * results are built in the browser from local answers, so their page
 * shell (/hasil) is enough.
 */

import { DASS21_ITEM_COUNT } from "./answers";

export function precachePaths(locale: string): string[] {
  const prefix = locale === "en" ? "/en" : "";
  return [
    prefix || "/",
    `${prefix}/mulai`,
    ...Array.from({ length: DASS21_ITEM_COUNT }, (_, i) => `${prefix}/skrining/${i + 1}`),
    `${prefix}/keamanan`,
    `${prefix}/krisis`,
    `${prefix}/hasil`,
    `${prefix}/rencana-keselamatan`,
  ];
}

/**
 * A small inline script (no React bundle on the screening pages) that
 * registers /sw.js after the page has loaded and asks it to cache the
 * pages above.
 */
export function serviceWorkerScript(locale: string): string {
  const paths = JSON.stringify(precachePaths(locale));
  return `if("serviceWorker"in navigator){addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").then(function(){return navigator.serviceWorker.ready}).then(function(r){r.active&&r.active.postMessage({type:"precache",paths:${paths}})}).catch(function(){})})}`;
}
