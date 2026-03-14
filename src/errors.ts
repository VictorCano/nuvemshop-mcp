import { NuvemshopMcpError } from './types.js';

function mapStatusToCode(status: number): string {
  switch (status) {
    case 401:
      return 'UNAUTHORIZED';
    case 404:
      return 'NOT_FOUND';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMITED';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'SERVER_ERROR';
    default:
      return 'API_ERROR';
  }
}

function getRetryHint(status: number): string | undefined {
  if (status === 429) {
    return 'Rate limit reached — try again in a few seconds';
  }
  if (status >= 500 && status <= 599) {
    return 'Server error — try again shortly';
  }
  if (status === 401) {
    return 'Check USER_ACCESS_TOKEN is valid';
  }
  if (status === 404) {
    return 'Resource not found — verify the ID';
  }
  return undefined;
}

function getMessageForCode(code: string): string {
  switch (code) {
    case 'UNAUTHORIZED':
      return 'Authentication failed';
    case 'NOT_FOUND':
      return 'Resource not found';
    case 'RATE_LIMITED':
      return 'Rate limit exceeded';
    case 'VALIDATION_ERROR':
      return 'Validation error';
    case 'SERVER_ERROR':
      return 'Server error';
    default:
      return 'API error';
  }
}

export async function normalizeError(res: Response, resource: string): Promise<NuvemshopMcpError> {
  const code = mapStatusToCode(res.status);
  const retryHint = getRetryHint(res.status);
  const message = getMessageForCode(code);

  let detail: string;
  try {
    const body = (await res.json()) as unknown;
    detail = JSON.stringify(body);
  } catch {
    detail = res.statusText || `HTTP ${res.status}`;
  }

  return new NuvemshopMcpError({
    code,
    message,
    detail,
    status: res.status,
    resource,
    retryHint,
  });
}
