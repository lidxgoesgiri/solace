import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

/**
 * Locale routing. Indonesian is the default for everyone (PRD: "Default
 * Indonesia"); only an explicit choice made with the language switch, which
 * next-intl stores in its locale cookie, changes it. The browser's
 * Accept-Language header is therefore ignored.
 */
export default function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("accept-language");
  return handleI18nRouting(new NextRequest(request, { headers }));
}

export const config = {
  // Everything except API routes, Next internals, Vercel internals, and files.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
