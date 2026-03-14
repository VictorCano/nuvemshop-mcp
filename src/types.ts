export interface NuvemshopMcpError {
  isError: true;
  code: string;
  message: string;
  detail: string;
  resource?: string;
  retryHint?: string;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface NuvemshopClientConfig {
  accessToken: string;
  storeId: string;
}
