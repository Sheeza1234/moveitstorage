import { NextRequest, NextResponse } from "next/server";
import { decodeRpc, encodeRpc } from "@/services/rpc-codec";
import { getServerServices, persistBackend } from "@/server/registry";
import { runAsUser } from "@/server/request-context";
import { csrfProblem, sessionUser } from "@/server/auth";
import { authorizeRpc } from "@/server/access";
import methods from "@/server/rpc-methods.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = methods as Record<string, string[]>;

function json(body: unknown, status = 200) {
  return new NextResponse(encodeRpc(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
const fail = (status: number, message: string, code?: string) => json({ ok: false, error: { message, code } }, status);

/**
 * POST /api/rpc/<service>/<method>  { args: [...] }
 * Runs a method of the real service layer for the SIGNED-IN user (session cookie). Only methods declared on the service
 * interfaces are callable, the user needs access to the service's module, and the service then checks the exact action
 * with the user's own permission set.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ service: string; method: string }> }) {
  const { service, method } = await ctx.params;

  const problem = csrfProblem(req);
  if (problem) return fail(problem.startsWith("Cross") ? 403 : 400, problem, problem.startsWith("Cross") ? "FORBIDDEN" : undefined);
  if (!ALLOWED[service]?.includes(method)) return fail(404, `Unknown service method ${service}.${method}.`);

  const user = sessionUser(req);
  if (!user) return fail(401, "Please sign in.", "UNAUTHENTICATED");

  const denied = authorizeRpc(service, method, user.permissions);
  if (denied) return fail(403, denied, "FORBIDDEN");

  let args: unknown[];
  try {
    const body = decodeRpc<{ args?: unknown[] }>(await req.text());
    args = Array.isArray(body.args) ? body.args : [];
  } catch {
    return fail(400, "Malformed request body.");
  }

  try {
    const target = (getServerServices() as unknown as Record<string, Record<string, (...a: unknown[]) => Promise<unknown>>>)[service];
    const result = await runAsUser({ id: user.id, name: user.name, role: user.role, permissions: user.permissions }, () => Promise.resolve(target[method](...args)));
    persistBackend();
    return json({ ok: true, result });
  } catch (err) {
    persistBackend(); // a failed call may still have changed state (e.g. audit entries)
    // not `instanceof`: a dev reload can load the error class twice, which would turn a denial into a 400
    if ((err as { code?: string } | null)?.code === "FORBIDDEN") return fail(403, (err as Error).message, "FORBIDDEN");
    return fail(400, err instanceof Error ? err.message : "Request failed.");
  }
}
