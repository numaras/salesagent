/**
 * AdCP testing hooks for dry-run, mock-time, test sessions.
 * Ported from python_src/src/core/testing_hooks.py
 *
 * These hooks allow AI agents to exercise the full media-buy flow
 * without side-effects (dry-run) or with deterministic time (mock-time).
 */

export interface TestContext {
  dryRun?: boolean;
  mockTime?: string;
  jumpToEvent?: string;
  testSessionId?: string;
}

const HEADER_DRY_RUN = "x-adcp-test-dry-run";
const HEADER_MOCK_TIME = "x-adcp-test-mock-time";
const HEADER_JUMP_TO_EVENT = "x-adcp-test-jump-to-event";
const HEADER_SESSION_ID = "x-adcp-test-session-id";

/**
 * Extract testing context from request headers.
 * Returns a TestContext if any test header is present, null otherwise.
 */
export function extractTestContext(
  headers: Record<string, string | undefined>
): TestContext | null {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v !== undefined) {
      lower[k.toLowerCase()] = v;
    }
  }

  const dryRun = lower[HEADER_DRY_RUN];
  const mockTime = lower[HEADER_MOCK_TIME];
  const jumpToEvent = lower[HEADER_JUMP_TO_EVENT];
  const testSessionId = lower[HEADER_SESSION_ID];

  if (!dryRun && !mockTime && !jumpToEvent && !testSessionId) {
    return null;
  }

  return {
    dryRun: dryRun === "true" || dryRun === "1",
    mockTime: mockTime || undefined,
    jumpToEvent: jumpToEvent || undefined,
    testSessionId: testSessionId || undefined,
  };
}

/**
 * Apply testing modifications to a response based on the test context.
 *
 * - dry_run: wraps the response in `{ dry_run: true, data }`.
 * - mock_time: overrides any timestamp fields in the data with the mock time.
 *
 * Returns the (possibly modified) data.
 */
export function applyTestingHooks<T>(
  data: T,
  testContext: TestContext | null,
  _operation: string
): T | { dry_run: true; simulated: true; operation: string; data: T } {
  if (!testContext) return data;

  if (testContext.mockTime) {
    overrideDateFields(data, testContext.mockTime);
  }

  if (testContext.dryRun) {
    return {
      dry_run: true,
      simulated: true,
      operation: _operation,
      data,
    };
  }

  return data;
}

/**
 * Recursively override string fields that look like ISO timestamps
 * with the mock time value.
 */
function overrideDateFields(obj: unknown, mockTime: string): void {
  if (obj === null || obj === undefined || typeof obj !== "object") return;

  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      overrideDateFields(item, mockTime);
    }
    return;
  }

  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const val = record[key];
    if (typeof val === "string" && ISO_DATE_RE.test(val)) {
      record[key] = mockTime;
    } else if (typeof val === "object" && val !== null) {
      overrideDateFields(val, mockTime);
    }
  }
}
