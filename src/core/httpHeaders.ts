/**
 * Case-insensitive HTTP header lookup.
 * HTTP headers are case-insensitive per RFC 7230.
 */

export type HeadersLike = Record<string, string | string[] | undefined>;

export function getHeaderCaseInsensitive(
  headers: HeadersLike | null | undefined,
  headerName: string
): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const nameLower = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === nameLower) {
      if (Array.isArray(value)) return value[0];
      return value as string;
    }
  }
  return undefined;
}
