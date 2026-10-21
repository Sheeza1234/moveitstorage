/** JSON cannot carry `undefined`; RPC arguments / results use a tagged marker so optional params survive the wire. */
const UNDEF = { $moveit: "undefined" };

export function encodeRpc(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (v === undefined ? UNDEF : v));
}

export function decodeRpc<T = unknown>(text: string): T {
  return JSON.parse(text, (_k, v) => (v && typeof v === "object" && (v as { $moveit?: string }).$moveit === "undefined" ? undefined : v)) as T;
}
