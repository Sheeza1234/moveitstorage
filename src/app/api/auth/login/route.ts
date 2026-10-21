import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, cookieOptions, csrfProblem, userService } from "@/server/auth";
import { persistBackend } from "@/server/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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
      persistBackend();
      return NextResponse.json({ ok: false, error: "Incorrect email or password, or the account is disabled." }, { status: 401 });
    }
    const { token, maxAgeSeconds } = users.createSession(user.id);
    persistBackend();
    const res = NextResponse.json({ ok: true, user });
    res.cookies.set(SESSION_COOKIE, token, cookieOptions(req, maxAgeSeconds));
    res.headers.set("cache-control", "no-store");
    return res;
  } catch (err) {
    persistBackend();
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Sign-in failed." }, { status: 429 });
  }
}
