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
 * Applies a pinned theme as <html data-theme="…"> and handles clicks on the
 * theme switch. Choosing the theme the system already uses removes the pin,
 * so Solace follows the system again. React re-renders <html> when the
 * language changes and drops the attribute, so the script puts a pinned
 * theme back whenever it disappears.
 */
export function themeScript(): string {
  const key = JSON.stringify(THEME_STORAGE_KEY);
  const toggle = JSON.stringify(`[${THEME_TOGGLE_ATTRIBUTE}]`);
  return `(function(){var k=${key},d=document.documentElement,m=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;function sys(){return m&&m.matches?"dark":"light"}function pinned(){try{var t=localStorage.getItem(k);return t==="light"||t==="dark"?t:null}catch(e){return null}}function apply(){var t=pinned();if(t&&d.getAttribute("data-theme")!==t)d.setAttribute("data-theme",t)}apply();if(window.MutationObserver)new window.MutationObserver(apply).observe(d,{attributes:true,attributeFilter:["data-theme"]});document.addEventListener("click",function(e){var b=e.target&&e.target.closest?e.target.closest(${toggle}):null;if(!b)return;var c=d.getAttribute("data-theme")||sys(),n=c==="dark"?"light":"dark",f=n===sys();try{if(f)localStorage.removeItem(k);else localStorage.setItem(k,n)}catch(e){}if(f)d.removeAttribute("data-theme");else d.setAttribute("data-theme",n)})})();`;
}
