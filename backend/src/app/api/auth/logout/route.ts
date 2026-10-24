import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, cookieOptions, csrfProblem, userService } from "@/server/auth";
import { persistBackend, withBackend } from "@/server/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const problem = csrfProblem(req);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 403 });
  userService().destroySession(req.cookies.get(SESSION_COOKIE)?.value);
  await persistBackend();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", cookieOptions(req, 0));
  return res;
}

export const POST = (req: NextRequest) => withBackend(() => handle(req));
