import { NextRequest, NextResponse } from "next/server";

/**
 * Cheap first gate: pages other than /login need a session cookie, otherwise the browser is sent to the sign-in page
 * before anything renders. (The cookie's validity and the user's permissions are enforced by the API.)
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname === "/favicon.ico") return NextResponse.next();
  if (!req.cookies.get("moveit_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// page routes only: the API enforces its own session, and static / metadata files must never pass through here
export const config = { matcher: ["/((?!api/|_next/|favicon|.*\\.[a-zA-Z0-9]+$).*)"] };
