import type { NextRequest } from "next/server";
import { getServerServices } from "./registry";
import type { MockUserService } from "@/services/mock/user-service";

export const SESSION_COOKIE = "moveit_session";

export const userService = () => getServerServices().userService as unknown as MockUserService;

export function sessionUser(req: NextRequest) {
  return userService().resolveSession(req.cookies.get(SESSION_COOKIE)?.value);
}

export function cookieOptions(req: NextRequest, maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === "production" && (req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")) === "https";
  return { httpOnly: true, sameSite: "lax" as const, path: "/", secure, maxAge: maxAgeSeconds };
}

/** Same-origin + custom header: stops a third-party page from making the browser sign in/out or call the API. */
export function csrfProblem(req: NextRequest): string | null {
  if (req.headers.get("x-moveit-rpc") !== "1") return "Missing request header.";
  const origin = req.headers.get("origin");
  if (origin) {
    // The web frontend forwards /api/* here, so the browser's origin is the frontend's host (sent as x-forwarded-host),
    // or a host listed in MOVEIT_ALLOWED_ORIGINS (comma separated).
    const allowed = new Set(
      [req.headers.get("host"), req.headers.get("x-forwarded-host"), ...(process.env.MOVEIT_ALLOWED_ORIGINS ?? "").split(",")]
        .map((h) => h?.trim().replace(/^https?:\/\//, ""))
        .filter(Boolean)
    );
    let originHost = "";
    try { originHost = new URL(origin).host; } catch { /* malformed origin is rejected below */ }
    if (!allowed.has(originHost)) return "Cross-origin request rejected.";
  }
  return null;
}
