import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, cookieOptions, csrfProblem, userService } from "@/server/auth";
import { persistBackend } from "@/server/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const problem = csrfProblem(req);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 403 });
  userService().destroySession(req.cookies.get(SESSION_COOKIE)?.value);
  persistBackend();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", cookieOptions(req, 0));
  return res;
}
