import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerServices, persistBackend } from "@/server/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/public/booking-requests
 * Receives a storage booking from the public booking portal (no sign-in). It can only ADD a request: the price is
 * recalculated on the server, input is validated, a hidden field catches simple bots and each address is rate limited.
 * Browsers may only call it from the origins in MOVEIT_PORTAL_ORIGINS (comma separated).
 */
const ORIGINS = (process.env.MOVEIT_PORTAL_ORIGINS || "http://localhost:8080,http://127.0.0.1:8080,https://themoveit.com,https://www.themoveit.com")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const schema = z.object({
  unitId: z.string().min(1).max(40),
  months: z.number().int().min(1).max(36),
  climateControlled: z.boolean(),
  insurance: z.boolean(),
  moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30).regex(/^[0-9+()\-\s]+$/),
  email: z.string().trim().email().max(160),
  notes: z.string().trim().max(1000).optional(),
});

const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 10;
}

function cors(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "content-type";
  }
  return headers;
}

const reply = (req: NextRequest, body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { ...cors(req), "cache-control": "no-store" } });

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && !ORIGINS.includes(origin)) return reply(req, { ok: false, error: "This website is not allowed to send bookings." }, 403);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (limited(ip)) return reply(req, { ok: false, error: "Too many requests. Please call us to book." }, 429);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply(req, { ok: false, error: "Malformed request." }, 400);
  }
  // hidden field real visitors never fill in: pretend success so bots learn nothing
  if (typeof body.website === "string" && body.website.trim()) return reply(req, { ok: true, reference: "MV-00000" });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return reply(req, { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." }, 400);
  if (parsed.data.moveInDate < new Date().toISOString().slice(0, 10)) return reply(req, { ok: false, error: "Choose a move-in date from today." }, 400);

  try {
    const created = await getServerServices().bookingRequestService.submitBookingRequest({ ...parsed.data, source: "Booking portal" });
    persistBackend();
    return reply(req, { ok: true, reference: created.reference, monthlyAed: created.monthlyAed, totalAed: created.totalAed });
  } catch (err) {
    return reply(req, { ok: false, error: err instanceof Error ? err.message : "Could not save your booking." }, 400);
  }
}
