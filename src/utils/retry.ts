/**
 * Retry utility with exponential backoff and jitter
 * Only retries on 429 (Too Many Requests) and 5xx (Server Errors)
 * Never retries on 4xx (Client Errors)
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  factor?: number;
  jitterPercent?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 5,
  baseDelayMs: 500,
  factor: 2,
  jitterPercent: 15,
};

/**
 * Check if an HTTP status code should trigger a retry
 */
export function shouldRetry(statusCode: number): boolean {
  // Retry on 429 (Too Many Requests) and 5xx (Server Errors)
  // Never retry on 4xx (Client Errors)
  return statusCode === 429 || (statusCode >= 500 && statusCode < 600);
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = options.baseDelayMs * Math.pow(options.factor, attempt - 1);
  const jitter = (exponentialDelay * options.jitterPercent) / 100;
  const jitterAmount = (Math.random() * 2 - 1) * jitter; // ±jitter
  return Math.max(0, exponentialDelay + jitterAmount);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * Honors Retry-After header when present (429 responses)
 * @param fn Function to retry (should throw on retryable errors)
 * @param options Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Check if error has a status code
      let statusCode: number | undefined;
      let retryAfter: number | undefined;
      
      if (error && typeof error === 'object' && 'statusCode' in error) {
        statusCode = error.statusCode as number;
        if ('retryAfter' in error) {
          retryAfter = error.retryAfter as number;
        }
      } else if (error && typeof error === 'object' && 'status' in error) {
        statusCode = error.status as number;
      }

      // Don't retry if it's not a retryable error
      if (statusCode !== undefined && !shouldRetry(statusCode)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === opts.maxAttempts) {
        break;
      }

      // Calculate delay: use Retry-After if present (429), otherwise exponential backoff
      let delay: number;
      if (statusCode === 429 && retryAfter !== undefined) {
        // Honor Retry-After header (in seconds, convert to ms)
        delay = retryAfter * 1000;
      } else {
        // Use exponential backoff with jitter
        delay = calculateDelay(attempt, opts);
      }
      
      await sleep(delay);
    }
  }

  // All retries exhausted
  throw lastError;
}

