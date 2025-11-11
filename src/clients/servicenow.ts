/**
 * ServiceNow Table API client
 * Supports Basic Auth, OAuth, and API Key authentication
 * Implements retry logic for 429/5xx errors
 */

import { config } from '../../config/env';
import { logger } from '../utils/logger';
import { withRetry, shouldRetry } from '../utils/retry';

export type AuthMode = 'basic' | 'oauth' | 'apiKey';

export interface TableApiParams {
  sysparm_fields?: string;
  sysparm_limit?: number;
  sysparm_offset?: number;
  sysparm_query?: string;
  sysparm_display_value?: boolean;
}

export interface ServiceNowError extends Error {
  statusCode: number;
  response?: unknown;
  retryAfter?: number; // Retry-After header value in seconds
}

/**
 * ServiceNow Table API client
 */
export class ServiceNowClient {
  private instanceUrl: string;
  private authMode: AuthMode;
  private authHeader: string;

  constructor(
    instanceUrl: string = config.SERVICE_NOW_INSTANCE,
    authMode: AuthMode = config.AUTH_MODE as AuthMode
  ) {
    this.instanceUrl = instanceUrl.replace(/\/$/, ''); // Remove trailing slash
    this.authMode = authMode;
    this.authHeader = this.buildAuthHeader();
  }

  /**
   * Build authentication header based on auth mode
   */
  private buildAuthHeader(): string {
    switch (this.authMode) {
      case 'basic': {
        const credentials = Buffer.from(
          `${config.SERVICE_NOW_USER}:${config.SERVICE_NOW_PASSWORD}`
        ).toString('base64');
        return `Basic ${credentials}`;
      }

      case 'oauth': {
        if (!config.SERVICE_NOW_CLIENT_ID || !config.SERVICE_NOW_CLIENT_SECRET) {
          throw new Error('OAuth requires SERVICE_NOW_CLIENT_ID and SERVICE_NOW_CLIENT_SECRET');
        }
        const credentials = Buffer.from(
          `${config.SERVICE_NOW_CLIENT_ID}:${config.SERVICE_NOW_CLIENT_SECRET}`
        ).toString('base64');
        return `Basic ${credentials}`;
      }

      case 'apiKey': {
        if (!config.SERVICE_NOW_API_KEY) {
          throw new Error('API Key auth requires SERVICE_NOW_API_KEY');
        }
        return `Bearer ${config.SERVICE_NOW_API_KEY}`;
      }

      default:
        throw new Error(`Unsupported auth mode: ${this.authMode}`);
    }
  }

  /**
   * Build query string from params
   */
  private buildQueryString(params: TableApiParams): string {
    const queryParts: string[] = [];

    if (params.sysparm_fields) {
      queryParts.push(`sysparm_fields=${encodeURIComponent(params.sysparm_fields)}`);
    }
    if (params.sysparm_limit !== undefined) {
      queryParts.push(`sysparm_limit=${params.sysparm_limit}`);
    }
    if (params.sysparm_offset !== undefined) {
      queryParts.push(`sysparm_offset=${params.sysparm_offset}`);
    }
    if (params.sysparm_query) {
      queryParts.push(`sysparm_query=${encodeURIComponent(params.sysparm_query)}`);
    }
    // Default to false for programmatic use (returns sys_ids instead of display values)
    if (params.sysparm_display_value !== undefined) {
      queryParts.push(`sysparm_display_value=${params.sysparm_display_value}`);
    } else {
      queryParts.push(`sysparm_display_value=false`);
    }

    return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    method: string,
    url: string,
    body?: unknown
  ): Promise<T> {
    const makeRequest = async (): Promise<T> => {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Cursor-AI-Agent/1.0',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error: ServiceNowError = new Error(
          `ServiceNow API error: ${response.status} ${response.statusText}`
        ) as ServiceNowError;
        error.statusCode = response.status;
        error.response = data;
        
        // Capture Retry-After header if present
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) {
          const retryAfterSeconds = parseInt(retryAfter, 10);
          if (!isNaN(retryAfterSeconds)) {
            error.retryAfter = retryAfterSeconds;
          }
        }
        
        throw error;
      }

      return data as T;
    };

    return withRetry(makeRequest);
  }

  /**
   * Get records from a table
   */
  async getTable<T = unknown>(
    table: string,
    params: TableApiParams = {}
  ): Promise<{ result: T[] }> {
    const url = `${this.instanceUrl}/api/now/table/${table}${this.buildQueryString(params)}`;
    logger.debug(`GET ${url}`, { table, params });
    return this.request<{ result: T[] }>('GET', url);
  }

  /**
   * Create a record
   */
  async create<T = unknown>(
    table: string,
    payload: Record<string, unknown>
  ): Promise<{ result: T }> {
    const url = `${this.instanceUrl}/api/now/table/${table}`;
    logger.debug(`POST ${url}`, { table, payload: { ...payload, password: '***REDACTED***' } });
    return this.request<{ result: T }>('POST', url, payload);
  }

  /**
   * Update a record (PATCH)
   */
  async patch<T = unknown>(
    table: string,
    sysId: string,
    payload: Record<string, unknown>
  ): Promise<{ result: T }> {
    const url = `${this.instanceUrl}/api/now/table/${table}/${sysId}`;
    logger.debug(`PATCH ${url}`, { table, sysId, payload });
    return this.request<{ result: T }>('PATCH', url, payload);
  }

  /**
   * Delete a record
   */
  async del(table: string, sysId: string): Promise<void> {
    const url = `${this.instanceUrl}/api/now/table/${table}/${sysId}`;
    logger.debug(`DELETE ${url}`, { table, sysId });
    await this.request('DELETE', url);
  }
}

// Export singleton instance
export const servicenowClient = new ServiceNowClient();

