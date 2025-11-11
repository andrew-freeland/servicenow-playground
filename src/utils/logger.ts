/**
 * Logger utility with secret redaction
 * - Development: human-readable console logs
 * - Production: JSON logs
 */

import { config } from '../../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

// Secrets to redact
const SECRET_KEYS = [
  'password',
  'pass',
  'user',
  'token',
  'secret',
  'key',
  'authorization',
  'auth',
  'credential',
  'SERVICE_NOW_PASSWORD',
  'SERVICE_NOW_CLIENT_SECRET',
  'SERVICE_NOW_API_KEY',
];

/**
 * Redact secrets from an object
 */
function redactSecrets(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Check if string contains any secret patterns
    for (const key of SECRET_KEYS) {
      if (obj.toLowerCase().includes(key.toLowerCase())) {
        return '***REDACTED***';
      }
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSecrets);
  }

  if (typeof obj === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      const shouldRedact = SECRET_KEYS.some(secret => keyLower.includes(secret.toLowerCase()));
      redacted[key] = shouldRedact ? '***REDACTED***' : redactSecrets(value);
    }
    return redacted;
  }

  return obj;
}

/**
 * Format log entry for output
 */
function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? redactSecrets(meta) : {}),
  };

  if (config.NODE_ENV === 'production') {
    return JSON.stringify(entry);
  }

  // Human-readable format for development
  const metaStr = meta ? ` ${JSON.stringify(redactSecrets(meta), null, 2)}` : '';
  return `[${entry.timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => {
    console.debug(formatLog('debug', message, meta));
  },

  info: (message: string, meta?: Record<string, unknown>) => {
    console.info(formatLog('info', message, meta));
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(formatLog('warn', message, meta));
  },

  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(formatLog('error', message, meta));
  },
};

