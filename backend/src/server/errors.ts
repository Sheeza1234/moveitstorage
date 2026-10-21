/** Raised by server-side authorization checks. The RPC route maps it to HTTP 403. */
export class PermissionError extends Error {
  readonly code = "FORBIDDEN";
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "PermissionError";
  }
}
