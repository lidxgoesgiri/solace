/**
 * Light and dark mode (PRD 6). Without a choice Solace follows the system
 * setting; the header's theme switch can pin light or dark on this device.
 * The choice is a display preference only, kept in localStorage.
 *
 * The switch works through a small inline script instead of a React
 * component, so the screening pages ship no extra JavaScript (PRD 14). The
 * script runs in <head> before the page paints, so a pinned theme never
 * flashes the other one first.
 */

export const THEME_STORAGE_KEY = "solace-theme";
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** Marks the button the script listens to. */
export const THEME_TOGGLE_ATTRIBUTE = "data-theme-toggle";

/**
 * Always exposes the effective theme as <html data-theme="…">. It follows
 * system changes until the first choice, then remembers either mode even
 * when it matches the system. The current choice survives denied storage
 * writes, and an observer restores the attribute if it is removed or changed.
 */
export function themeScript(): string {
  const key = JSON.stringify(THEME_STORAGE_KEY);
  const toggle = JSON.stringify(`[${THEME_TOGGLE_ATTRIBUTE}]`);
  return `(function(){var k=${key},d=document.documentElement,m=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;function sys(){return m&&m.matches?"dark":"light"}function pinned(){try{var t=localStorage.getItem(k);return t==="light"||t==="dark"?t:null}catch(e){return null}}var choice=pinned();function apply(){var t=choice||sys();if(d.getAttribute("data-theme")!==t)d.setAttribute("data-theme",t)}apply();if(m){if(m.addEventListener)m.addEventListener("change",apply);else if(m.addListener)m.addListener(apply)}if(window.MutationObserver)new window.MutationObserver(apply).observe(d,{attributes:true,attributeFilter:["data-theme"]});document.addEventListener("click",function(e){var b=e.target&&e.target.closest?e.target.closest(${toggle}):null;if(!b)return;choice=(choice||sys())==="dark"?"light":"dark";try{localStorage.setItem(k,choice)}catch(e){}apply()})})();`;
}
