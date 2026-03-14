import { normalizeError } from './errors.js';
import { logger } from './logger.js';
import { NuvemshopMcpError } from './types.js';
import type { NuvemshopClientConfig, PaginationParams } from './types.js';

const BASE_URL = 'https://api.nuvemshop.com.br/2025-03';
const USER_AGENT = 'nuvemshop-mcp (https://github.com/VictorCano/nuvemshop-mcp)';
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const SAFE_RETRY_METHODS = new Set(['GET']);
const BACKOFF_MS = [1000, 2000, 4000];
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelay(res: Response, attempt: number): number {
  const retryAfter = res.headers.get('Retry-After');
  if (retryAfter !== null) {
    const seconds = parseFloat(retryAfter);
    if (!isNaN(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }
  const fallback = BACKOFF_MS[BACKOFF_MS.length - 1] ?? 4000;
  return BACKOFF_MS[attempt] ?? fallback;
}

function shouldRetry(status: number, method: string): boolean {
  if (!RETRY_STATUSES.has(status)) {
    return false;
  }
  // 429 retries for all methods; 5xx retries only for safe methods (GET)
  if (status === 429) {
    return true;
  }
  return SAFE_RETRY_METHODS.has(method.toUpperCase());
}

export class NuvemshopClient {
  private readonly config: NuvemshopClientConfig;

  constructor(config: NuvemshopClientConfig) {
    this.config = config;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${BASE_URL}/${this.config.storeId}${path}`;
    const upperMethod = method.toUpperCase();

    const headers: Record<string, string> = {
      Authentication: `bearer ${this.config.accessToken}`,
      'User-Agent': USER_AGENT,
    };

    if (
      body !== undefined &&
      (upperMethod === 'POST' || upperMethod === 'PUT' || upperMethod === 'PATCH')
    ) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
    }

    const init: RequestInit = {
      method: upperMethod,
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    let lastRes: Response | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0 && lastRes !== undefined) {
        const waitMs = getRetryDelay(lastRes, attempt - 1);
        logger.warn(
          `[client] Retry ${attempt}/${MAX_RETRIES} for ${upperMethod} ${path} after ${waitMs}ms`,
        );
        await delay(waitMs);
        // Refresh signal for each retry attempt
        (init as RequestInit & { signal: AbortSignal }).signal = AbortSignal.timeout(TIMEOUT_MS);
      }

      const res = await fetch(url, init);
      lastRes = res;

      if (res.ok) {
        return res.json() as Promise<T>;
      }

      if (attempt < MAX_RETRIES && shouldRetry(res.status, upperMethod)) {
        // Will retry in next loop iteration
        continue;
      }

      // Non-retryable or exhausted retries — normalize and throw
      throw await normalizeError(res, path);
    }

    // Should never reach here, but TypeScript needs this
    const finalRes = lastRes ?? new Response(null, { status: 500 });
    throw await normalizeError(finalRes, path);
  }

  async list<T>(path: string, params?: PaginationParams): Promise<T> {
    const page = params?.page ?? 1;
    const per_page = params?.per_page ?? 20;
    const qs = `?page=${page}&per_page=${per_page}`;
    return this.request<T>('GET', `${path}${qs}`);
  }

  /**
   * Like request(), but returns an empty array on 404 (Nuvemshop returns 404 for empty pages).
   */
  async requestList<T>(method: string, path: string): Promise<T[]> {
    try {
      return await this.request<T[]>(method, path);
    } catch (err) {
      if (err instanceof NuvemshopMcpError && err.status === 404) {
        return [];
      }
      throw err;
    }
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  del<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}
