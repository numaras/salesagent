/**
 * Domain error hierarchy. Use these instead of generic Error.
 * Each protocol (MCP, A2A, HTTP) has a single mapper in its own module.
 */

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class AuthError extends DomainError {
  constructor(message: string = "Authentication required") {
    super(message, "AUTH_ERROR");
    this.name = "AuthError";
  }
}

export class TenantError extends DomainError {
  constructor(message: string = "Could not resolve tenant") {
    super(message, "TENANT_ERROR");
    this.name = "TenantError";
  }
}

export class AdapterError extends DomainError {
  constructor(message: string, public readonly adapterType?: string) {
    super(message, "ADAPTER_ERROR");
    this.name = "AdapterError";
  }
}

/** Map domain error to MCP tool response. */
export function toMcpErrorResponse(err: unknown): {
  content: { type: "text"; text: string }[];
  isError: true;
} {
  const e = err instanceof DomainError ? err : new DomainError(err instanceof Error ? err.message : "Internal error");
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: e.code, message: e.message }) }],
    isError: true,
  };
}

/** Map domain error to JSON-RPC error object. */
export function toJsonRpcError(err: unknown): { code: number; message: string } {
  if (err instanceof TenantError) return { code: -32001, message: err.message };
  if (err instanceof AuthError) return { code: -32002, message: err.message };
  if (err instanceof NotFoundError) return { code: -32004, message: err.message };
  if (err instanceof ValidationError) return { code: -32602, message: err.message };
  if (err instanceof DomainError) return { code: -32603, message: err.message };
  return { code: -32603, message: err instanceof Error ? err.message : "Internal error" };
}

/** Map domain error to HTTP status + JSON body. */
export function toHttpError(err: unknown): { status: number; body: { error: string; message: string } } {
  if (err instanceof TenantError) return { status: 400, body: { error: err.code, message: err.message } };
  if (err instanceof AuthError) return { status: 401, body: { error: err.code, message: err.message } };
  if (err instanceof NotFoundError) return { status: 404, body: { error: err.code, message: err.message } };
  if (err instanceof ValidationError) return { status: 422, body: { error: err.code, message: err.message } };
  if (err instanceof DomainError) return { status: 500, body: { error: err.code, message: err.message } };
  return { status: 500, body: { error: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "Internal error" } };
}
