import { checkApplicationReadiness } from "@/server/readiness";

export async function GET() {
  const ready = await checkApplicationReadiness();

  return Response.json(
    { status: ready ? "ready" : "unavailable" },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
