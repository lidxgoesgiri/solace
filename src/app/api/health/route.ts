/**
 * Health check for uptime monitoring during the build and judging weeks
 * (PRD 14, Keandalan). Returns no user data: the app never sends screening
 * answers to the server.
 */
export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "solace",
      // Short commit of the running deployment; "dev" outside Vercel.
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      time: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
