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
  if (origin && new URL(origin).host !== req.headers.get("host")) return "Cross-origin request rejected.";
  return null;
}
