export interface PaginatedResult<T> {
  results: T[];
  pagination: {
    page: number;
    per_page: number;
    has_more: boolean;
  };
}

/**
 * Builds a URL query string from a params object, filtering out undefined and null values.
 * Returns "?" + encoded params if non-empty, or empty string if no params.
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) {
    return '';
  }
  const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
  return `?${qs}`;
}

/**
 * Wraps a list of items with pagination metadata.
 * has_more is true when items.length === per_page (more pages may exist).
 */
export function wrapPaginated<T>(items: T[], page: number, per_page: number): PaginatedResult<T> {
  return {
    results: items,
    pagination: {
      page,
      per_page,
      has_more: items.length === per_page,
    },
  };
}

/**
 * Flattens a multilingual i18n field to a single string.
 * - i18n object: returns first non-empty value
 * - plain string: returns as-is
 * - null/undefined: returns empty string
 */
export function flattenI18n(field: Record<string, string> | string | null | undefined): string {
  if (field === null || field === undefined) {
    return '';
  }
  if (typeof field === 'string') {
    return field;
  }
  for (const value of Object.values(field)) {
    if (value && value.trim() !== '') {
      return value;
    }
  }
  return '';
}

/**
 * Preprocesses a value that may be a JSON string into a parsed value.
 * Some MCP transports serialize complex params (arrays/objects) as JSON strings.
 */
export function jsonPreprocess(val: unknown): unknown {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

/**
 * Wraps data in the standard MCP tool return format.
 */
export function toolResponse(data: unknown): { content: [{ type: 'text'; text: string }] } {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}
