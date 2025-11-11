/**
 * Seed script for Docs & Integrations Help Desk
 * Seeds KB articles and incidents
 * Idempotent: avoids duplicates on rerun
 */

import { servicenowClient } from '../clients/servicenow';
import { logger } from '../utils/logger';

interface KBArticle {
  short_description: string;
  text: string;
  kb_knowledge_base?: string;
  active?: boolean;
  workflow_state?: string;
  valid_to?: string;
}

interface Incident {
  short_description: string;
  description?: string;
  category?: string;
  priority?: string;
  impact?: string;
  urgency?: string;
  state?: string;
}

const KB_ARTICLES: KBArticle[] = [
  {
    short_description: 'Rotate API keys for Product X',
    text: `# Rotate API keys for Product X

## Overview
This guide explains how to rotate API keys for Product X integrations.

## Steps
1. Log into Product X admin console
2. Navigate to Settings > API Keys
3. Generate a new API key
4. Update the integration configuration in ServiceNow
5. Test the integration
6. Revoke the old API key after 24 hours

## Common Issues
- Old key still active: Wait 24 hours before revoking
- Integration fails: Verify new key is correctly configured
- Rate limits: New keys may have different rate limits`,
    active: true,
  },
  {
    short_description: 'OAuth callback errors (common causes & fixes)',
    text: `# OAuth Callback Errors: Common Causes & Fixes

## Common Causes

### 1. Redirect URI Mismatch
The redirect URI in your OAuth app must exactly match the callback URL.

**Fix:** Verify redirect URI in OAuth app settings matches exactly (including protocol, port, path).

### 2. Expired Authorization Code
Authorization codes expire after 10 minutes.

**Fix:** Complete the OAuth flow immediately after receiving the code.

### 3. Invalid Client Credentials
Client ID or secret may be incorrect.

**Fix:** Verify credentials in environment variables.

### 4. CORS Issues
Browser blocking cross-origin requests.

**Fix:** Ensure proper CORS configuration on OAuth provider.

## Troubleshooting Steps
1. Check OAuth app configuration
2. Verify redirect URI
3. Check authorization code expiration
4. Review error logs for specific error codes`,
    active: true,
  },
  {
    short_description: 'Webhook signature verification guide',
    text: `# Webhook Signature Verification Guide

## Overview
Webhook signature verification ensures requests are authentic and haven't been tampered with.

## Implementation

### Step 1: Extract Signature
Extract the signature from the request header (usually \`X-Signature\` or \`X-Webhook-Signature\`).

### Step 2: Compute Expected Signature
Use HMAC-SHA256 with your webhook secret:
\`\`\`
signature = HMAC-SHA256(payload, secret)
\`\`\`

### Step 3: Compare Signatures
Use constant-time comparison to prevent timing attacks:
\`\`\`
crypto.timingSafeEqual(receivedSignature, expectedSignature)
\`\`\`

## Best Practices
- Always use constant-time comparison
- Store webhook secret securely (env vars, secret manager)
- Log verification failures for security monitoring
- Reject requests with invalid signatures immediately`,
    active: true,
  },
  {
    short_description: 'Retry/backoff pattern for 429 and 5xx',
    text: `# Retry/Backoff Pattern for 429 and 5xx Errors

## Overview
Implement exponential backoff with jitter for retryable errors.

## When to Retry
- **429 (Too Many Requests)**: Rate limit exceeded
- **5xx (Server Errors)**: Temporary server issues

## When NOT to Retry
- **4xx (Client Errors)**: Bad request, authentication issues, etc.

## Implementation

### Exponential Backoff Formula
\`\`\`
delay = baseDelay * (2 ^ attempt) + jitter
\`\`\`

### Recommended Settings
- Base delay: 500ms
- Factor: 2
- Max attempts: 5
- Jitter: ±15%

## Example
\`\`\`typescript
async function withRetry(fn, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (shouldRetry(error.statusCode) && attempt < maxAttempts) {
        const delay = 500 * Math.pow(2, attempt - 1);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
}
\`\`\``,
    active: true,
  },
];

const INCIDENTS: Incident[] = [
  {
    short_description: 'OAuth callback failing for Product X integration',
    description: 'Users reporting OAuth callback errors when trying to connect Product X. Error code: OAUTH_CALLBACK_FAILED',
    category: 'integration',
    priority: '2',
    impact: '2',
    urgency: '2',
    state: '1', // New
  },
  {
    short_description: 'API key rotation needed for legacy integration',
    description: 'API key expires in 7 days. Need to rotate and update configuration.',
    category: 'integration',
    priority: '3',
    impact: '1',
    urgency: '3',
    state: '2', // In Progress
  },
  {
    short_description: 'Webhook signature verification failing',
    description: 'Webhook endpoint rejecting valid requests due to signature mismatch.',
    category: 'integration',
    priority: '1',
    impact: '2',
    urgency: '1',
    state: '1', // New
  },
  {
    short_description: 'Rate limiting issues with Product Y API',
    description: 'Receiving 429 errors frequently. Need to implement proper backoff.',
    category: 'integration',
    priority: '2',
    impact: '2',
    urgency: '2',
    state: '2', // In Progress
  },
  {
    short_description: 'Integration timeout after 30 seconds',
    description: 'Product Z integration timing out. May need to adjust timeout settings.',
    category: 'integration',
    priority: '3',
    impact: '1',
    urgency: '2',
    state: '1', // New
  },
  {
    short_description: 'OAuth token refresh not working',
    description: 'Tokens not refreshing automatically. Manual refresh required.',
    category: 'integration',
    priority: '2',
    impact: '2',
    urgency: '2',
    state: '6', // Resolved
  },
  {
    short_description: 'Webhook payload format changed',
    description: 'Upstream service changed webhook payload format. Integration needs update.',
    category: 'integration',
    priority: '2',
    impact: '2',
    urgency: '2',
    state: '1', // New
  },
  {
    short_description: 'API authentication credentials expired',
    description: 'Service account credentials expired. Need to update.',
    category: 'integration',
    priority: '1',
    impact: '3',
    urgency: '1',
    state: '2', // In Progress
  },
  {
    short_description: 'Integration dashboard showing incorrect metrics',
    description: 'Dashboard displaying incorrect success/failure rates. Data sync issue suspected.',
    category: 'reporting',
    priority: '3',
    impact: '1',
    urgency: '3',
    state: '1', // New
  },
  {
    short_description: 'Bulk import failing for large datasets',
    description: 'Import Set API failing when importing more than 1000 records. Error: TIMEOUT',
    category: 'integration',
    priority: '2',
    impact: '2',
    urgency: '2',
    state: '6', // Resolved
  },
];

/**
 * Check if KB article already exists
 */
async function kbArticleExists(shortDescription: string): Promise<boolean> {
  try {
    const result = await servicenowClient.getTable('kb_knowledge', {
      sysparm_query: `short_description="${shortDescription.replace(/"/g, '\\"')}"`,
      sysparm_limit: 1,
    });
    return result.result.length > 0;
  } catch (error) {
    logger.warn('Error checking KB article existence', { error });
    return false;
  }
}

/**
 * Get default knowledge base (IT) sys_id
 */
async function getDefaultKBBase(): Promise<string | null> {
  try {
    // Try to find the default "IT" knowledge base
    const result = await servicenowClient.getTable<{ sys_id: string; title?: string }>('kb_knowledge_base', {
      sysparm_query: 'title=IT',
      sysparm_limit: 1,
    });

    if (result.result.length > 0) {
      return result.result[0].sys_id;
    }

    // Fallback: get the first available KB base
    const allBases = await servicenowClient.getTable<{ sys_id: string }>('kb_knowledge_base', {
      sysparm_limit: 1,
    });

    if (allBases.result.length > 0) {
      logger.warn('Using first available KB base (IT not found)');
      return allBases.result[0].sys_id;
    }

    logger.warn('No knowledge base found - articles may not be queryable');
    return null;
  } catch (error) {
    logger.warn('Failed to get knowledge base - articles may not be queryable', { error });
    return null;
  }
}

/**
 * Seed KB articles
 */
async function seedKBArticles(): Promise<void> {
  logger.info('Seeding KB articles...');
  
  // Get default KB base
  const kbBaseSysId = await getDefaultKBBase();
  if (!kbBaseSysId) {
    logger.warn('Proceeding without KB base - articles may not be queryable');
  }

  // Calculate valid_to date (2 years from now)
  const validTo = new Date();
  validTo.setFullYear(validTo.getFullYear() + 2);
  const validToStr = validTo.toISOString().split('T')[0]; // YYYY-MM-DD format

  let created = 0;
  let skipped = 0;

  for (const article of KB_ARTICLES) {
    try {
      const exists = await kbArticleExists(article.short_description);
      if (exists) {
        logger.debug(`KB article already exists: ${article.short_description}`);
        skipped++;
        continue;
      }

      // Prepare article with all required fields
      const articlePayload: KBArticle = {
        ...article,
        active: true,
        workflow_state: 'published',
        valid_to: validToStr,
        ...(kbBaseSysId && { kb_knowledge_base: kbBaseSysId }),
      };

      await servicenowClient.create('kb_knowledge', articlePayload);
      logger.info(`Created KB article: ${article.short_description}`);
      created++;
    } catch (error) {
      logger.error(`Failed to create KB article: ${article.short_description}`, { error });
    }
  }

  logger.info(`KB articles seeded: ${created} created, ${skipped} skipped`);
}

/**
 * Seed incidents
 */
async function seedIncidents(): Promise<void> {
  logger.info('Seeding incidents...');
  let created = 0;
  let skipped = 0;

  for (const incident of INCIDENTS) {
    try {
      // Check if incident with same short_description exists
      const result = await servicenowClient.getTable('incident', {
        sysparm_query: `short_description="${incident.short_description.replace(/"/g, '\\"')}"`,
        sysparm_limit: 1,
      });

      if (result.result.length > 0) {
        logger.debug(`Incident already exists: ${incident.short_description}`);
        skipped++;
        continue;
      }

      await servicenowClient.create('incident', incident);
      logger.info(`Created incident: ${incident.short_description}`);
      created++;
    } catch (error) {
      logger.error(`Failed to create incident: ${incident.short_description}`, { error });
    }
  }

  logger.info(`Incidents seeded: ${created} created, ${skipped} skipped`);
}

/**
 * Main seed function
 */
async function seed(): Promise<void> {
  logger.info('Starting seed process...');
  try {
    await seedKBArticles();
    await seedIncidents();
    logger.info('Seed process completed successfully');
  } catch (error) {
    logger.error('Seed process failed', { error });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  seed();
}

export { seed };

