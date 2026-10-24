import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, cookieOptions, csrfProblem, userService } from "@/server/auth";
import { persistBackend, withBackend } from "@/server/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const problem = csrfProblem(req);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 403 });
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }
  try {
    const users = userService();
    const user = await users.authenticate(body.email ?? "", body.password ?? "");
    if (!user) {
      await persistBackend();
      return NextResponse.json({ ok: false, error: "Incorrect email or password, or the account is disabled." }, { status: 401 });
    }
    const { token, maxAgeSeconds } = users.createSession(user.id);
    await persistBackend();
    const res = NextResponse.json({ ok: true, user });
    res.cookies.set(SESSION_COOKIE, token, cookieOptions(req, maxAgeSeconds));
    res.headers.set("cache-control", "no-store");
    return res;
  } catch (err) {
    await persistBackend();
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Sign-in failed." }, { status: 429 });
  }
}

export const POST = (req: NextRequest) => withBackend(() => handle(req));
