export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    app: "vcglOne",
    timestamp: new Date().toISOString()
  });
}
