export class NuvemshopMcpError extends Error {
  readonly isError = true;
  readonly code: string;
  readonly detail: string;
  readonly status: number;
  readonly resource?: string;
  readonly retryHint?: string;

  constructor(opts: {
    code: string;
    message: string;
    detail: string;
    status: number;
    resource?: string;
    retryHint?: string;
  }) {
    super(opts.detail ? `${opts.message}: ${opts.detail}` : opts.message);
    this.name = 'NuvemshopMcpError';
    this.code = opts.code;
    this.detail = opts.detail;
    this.status = opts.status;
    this.resource = opts.resource;
    this.retryHint = opts.retryHint;
  }
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface NuvemshopClientConfig {
  accessToken: string;
  storeId: string;
}
