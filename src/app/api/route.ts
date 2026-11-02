import { NextResponse } from "next/server";

// Health check sederhana untuk monitoring deploy (Netlify / uptime ping).
export async function GET() {
  return NextResponse.json({ ok: true, app: "rumbela-web-app", version: "2.0" });
}
