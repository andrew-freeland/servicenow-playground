# ServiceNow Integration Guide

This document explains how the Help Desk integrates with ServiceNow, including authentication, API usage patterns, pagination, and retry/backoff rules.

---

## Authentication

### Supported Methods

The Help Desk supports three authentication methods:

1. **Basic Auth** (default)
   - Uses username and password
   - Environment variables: `SERVICE_NOW_USER`, `SERVICE_NOW_PASSWORD`
   - Set `AUTH_MODE=basic`

2. **OAuth 2.0**
   - Uses client ID and client secret
   - Environment variables: `SERVICE_NOW_CLIENT_ID`, `SERVICE_NOW_CLIENT_SECRET`
   - Set `AUTH_MODE=oauth`

3. **API Key**
   - Uses API key token
   - Environment variable: `SERVICE_NOW_API_KEY`
   - Set `AUTH_MODE=apiKey`

### Credential Storage

All credentials are stored in environment variables (never hardcoded). In production, use a secret manager like GCP Secret Manager.

### Required Roles

The ServiceNow user must have:
- `web_service_admin` role (for API access)
- `itil` role (for incident table access)
- `kb_admin` or `kb_knowledge_base` role (for KB article access)

**Never use the global admin role** unless explicitly required.

---

## Table API Usage Patterns

### Base URL Structure

```
https://<instance>.service-now.com/api/now/table/<TableName>
```

### Supported Tables

- `incident` - Incident management
- `kb_knowledge` - Knowledge Base articles

### Query Parameters

- `sysparm_query` - Filter records (ServiceNow query syntax)
- `sysparm_limit` - Maximum records to return (max 10,000)
- `sysparm_offset` - Pagination offset
- `sysparm_fields` - Comma-separated list of fields to return

### Example Queries

```typescript
// Get open incidents
GET /api/now/table/incident?sysparm_query=state<6&sysparm_limit=20

// Get KB articles matching keywords
GET /api/now/table/kb_knowledge?sysparm_query=active=true^short_descriptionLIKEoauth

// Get specific fields only
GET /api/now/table/incident?sysparm_fields=sys_id,number,short_description,state
```

### HTTP Methods

- `GET` - Retrieve records
- `POST` - Create records
- `PATCH` - Update specific fields (preferred over PUT)
- `DELETE` - Delete records

### Headers

All requests include:
- `Authorization`: Based on auth mode
- `Content-Type`: `application/json`
- `Accept`: `application/json`
- `User-Agent`: `Cursor-AI-Agent/1.0`

---

## Pagination & Incremental Reads

### Pagination Pattern

For large datasets, use `sysparm_limit` and `sysparm_offset`:

```typescript
let offset = 0;
const limit = 1000;
let hasMore = true;

while (hasMore) {
  const result = await client.getTable('incident', {
    sysparm_limit: limit,
    sysparm_offset: offset,
  });
  
  // Process results
  processRecords(result.result);
  
  hasMore = result.result.length === limit;
  offset += limit;
}
```

### Incremental Syncs

For incremental updates, use `sys_updated_on`:

```typescript
const lastRun = '2024-01-01 00:00:00';
const query = `sys_updated_on>${lastRun}`;

const result = await client.getTable('incident', {
  sysparm_query: query,
});
```

### Record Limits

- **Maximum per call**: 10,000 records
- **Recommended**: 1,000 records per call for optimal performance

---

## Retry/Backoff Rules

### When to Retry

Retry logic is triggered for:
- **HTTP 429** (Too Many Requests) - Rate limit exceeded
- **HTTP 5xx** (Server Errors) - Temporary server issues

### When NOT to Retry

Never retry on:
- **HTTP 4xx** (Client Errors) - Bad request, authentication issues, etc.

### Retry Configuration

- **Base delay**: 500ms
- **Exponential factor**: 2
- **Maximum attempts**: 5
- **Jitter**: ±15%

### Retry Formula

```
delay = baseDelay * (2 ^ attempt) + jitter
```

Example delays:
- Attempt 1: ~500ms
- Attempt 2: ~1000ms
- Attempt 3: ~2000ms
- Attempt 4: ~4000ms
- Attempt 5: ~8000ms

### Implementation

The retry logic is implemented in `/src/utils/retry.ts` and automatically applied to all ServiceNow API calls via the client.

---

## Error Handling

### Error Types

1. **ServiceNowError** - API errors with status code
2. **ValidationError** - Input validation failures (Zod)
3. **NetworkError** - Connection issues

### Error Response Format

```json
{
  "error": "ServiceNow API error: 401 Unauthorized",
  "statusCode": 401,
  "response": {
    "error": {
      "message": "User not authenticated",
      "detail": "..."
    }
  }
}
```

### Logging

All errors are logged with:
- Redacted secrets (passwords, tokens)
- Error context (request details)
- Stack traces (development only)

---

## Best Practices

1. **Always use `sysparm_fields`** to limit returned data
2. **Use PATCH for updates** (not PUT) to update specific fields only
3. **Validate payloads locally** before sending to ServiceNow
4. **Handle pagination** for large datasets
5. **Implement incremental syncs** for regular updates
6. **Log all API calls** with redacted secrets
7. **Never hardcode credentials**
8. **Use least-privilege roles**

---

## PDI Constraints

ServiceNow Personal Developer Instances (PDIs) have specific limitations:

- **10-minute inactivity shutdown** - Instance shuts down after 10 minutes of inactivity
- **7-day reset cycle** - Instance resets if not accessed within 7 days
- **Ephemeral data** - All data is temporary and may be lost
- **No fixed rate limits** - May return 429 if rate-limiting rules are configured
- **Plugin activation** - Plugins must be manually enabled (cannot be done via API)

---

## Troubleshooting

### 401 Unauthorized

- Verify credentials in environment variables
- Check user roles in ServiceNow
- Ensure auth mode matches credentials provided

### 403 Forbidden

- Verify user has required roles (`web_service_admin`, `itil`, etc.)
- Check table-level ACLs in ServiceNow

### 429 Too Many Requests

- Implement retry logic (already included)
- Reduce request frequency
- Use pagination to limit records per call

### 500 Server Error

- Check ServiceNow instance status
- Verify PDI is active (may have shut down)
- Review ServiceNow logs if accessible

---

## References

- [ServiceNow Table API Documentation](https://docs.servicenow.com/bundle/vancouver-application-development/page/integrate/inbound-rest/concept/c_TableAPI.html)
- [ServiceNow REST API Explorer](https://docs.servicenow.com/bundle/vancouver-application-development/page/integrate/inbound-rest/concept/c_RESTAPI.html)
- [ServiceNow Query Syntax](https://docs.servicenow.com/bundle/vancouver-platform-user-interface/page/use/common-ui-elements/reference/r_OpAvailableFiltersQueries.html)

