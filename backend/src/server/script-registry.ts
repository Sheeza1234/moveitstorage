import { trustScriptContext } from "./request-context";

/**
 * Entry point for UAT / maintenance scripts that run outside an HTTP request.
 * Importing it marks the process as a trusted script context (calls run as SUPER_ADMIN).
 * Never import this from application code.
 */
trustScriptContext();

export { services } from "./registry";
