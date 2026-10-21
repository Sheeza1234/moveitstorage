import { NextRequest, NextResponse } from "next/server";
import { sessionUser } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Who am I? 401 when there is no valid session. The permissions in the answer drive menus and tabs. */
export async function GET(req: NextRequest) {
  const user = sessionUser(req);
  if (!user) return NextResponse.json({ ok: false }, { status: 401, headers: { "cache-control": "no-store" } });
  return NextResponse.json({ ok: true, user }, { headers: { "cache-control": "no-store" } });
}
