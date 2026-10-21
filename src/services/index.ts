import type { ServiceRegistryShape } from "./registry-types";
import { decodeRpc, encodeRpc } from "./rpc-codec";

/**
 * Browser-safe service registry.
 * Every call is sent to the backend (POST /api/rpc/<service>/<method>) where the real service classes
 * run against the database. The shape is identical to the previous in-memory registry, so UI code is unchanged.
 */
/** Kept for older callers. The server no longer trusts a role sent by the browser: it uses the signed-in session. */
export function setRpcRole(role: string) {
  void role;
}

export class RpcError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "RpcError";
  }
}

function baseUrl(): string {
  if (typeof window !== "undefined") return "";
  return process.env.MOVEIT_INTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;
}

async function call(service: string, method: string, args: unknown[]) {
  const res = await fetch(`${baseUrl()}/api/rpc/${service}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-moveit-rpc": "1" },
    body: encodeRpc({ args }),
    cache: "no-store",
  });
  const payload = decodeRpc<{ ok: boolean; result?: unknown; error?: { message: string; code?: string } }>(await res.text());
  if (res.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/login") {
    // the session ended (or never existed): go to the sign-in page and come back afterwards
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }
  if (!payload.ok) throw new RpcError(payload.error?.message ?? `Request failed (${res.status})`, res.status, payload.error?.code);
  return payload.result;
}

const methodProxy = (service: string) =>
  new Proxy(
    {},
    {
      get(_t, method) {
        // never look like a thenable / iterator to `await`, React or devtools
        if (typeof method !== "string" || method === "then") return undefined;
        return (...args: unknown[]) => call(service, method, args);
      },
    }
  );

const cache = new Map<string, object>();
export const services = new Proxy({} as ServiceRegistryShape, {
  get(_t, service) {
    if (typeof service !== "string" || service === "then") return undefined;
    let p = cache.get(service);
    if (!p) cache.set(service, (p = methodProxy(service)));
    return p;
  },
});

export type { ServiceRegistryShape, ServiceName } from "./registry-types";
export * from "./interfaces/IDashboardService";
export * from "./interfaces/IWarehouseService";
export * from "./interfaces/ICustomerService";
export * from "./interfaces/IAllocationService";
export * from "./interfaces/IInventoryService";
export * from "./interfaces/IMovementService";
export * from "./interfaces/IContractService";
export * from "./interfaces/IDocumentService";
export * from "./interfaces/IBillingService";
export * from "./interfaces/ICustomerPortalIntegrationService";
export * from "./interfaces/IAuditService";
export * from "./interfaces/INotificationService";
export * from "./interfaces/IItemCatalogueService";
export * from "./interfaces/IPackingListService";
export * from "./interfaces/ICrewSheetService";
export * from "./interfaces/IPackingMaterialService";
export * from "./interfaces/IBoxCollectionService";
export * from "./interfaces/IWalkthroughDisclaimerService";
export * from "./interfaces/IEmployeeService";
export * from "./interfaces/IBookingRequestService";
