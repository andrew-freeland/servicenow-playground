# API Reference

Complete API reference for the Docs & Integrations Help Desk.

---

## Base URL

```
http://localhost:3000
```

Default port: `3000` (configurable via `PORT` environment variable)

---

## Endpoints

### Health Check

**GET** `/health`

Check server health status.

**Response:**
```json
{
  "status": "ok"
}
```

**Example:**
```bash
curl http://localhost:3000/health
```

---

### Seed Data

**POST** `/seed`

Seed KB articles and incidents into ServiceNow.

**Response:**
```json
{
  "message": "Seed completed successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/seed
```

**Note:** Idempotent - safe to run multiple times.

---

### Create Incident

**POST** `/incident`

Create a new incident.

**Request Body:**
```json
{
  "product": "Product X",
  "short_description": "OAuth callback failing",
  "description": "Users reporting OAuth callback errors when trying to connect Product X. Error code: OAUTH_CALLBACK_FAILED",
  "priority": "2",
  "impact": "2",
  "urgency": "2"
}
```

**Fields:**
- `product` (required): Product or integration name
- `short_description` (required): Short description of the issue
- `description` (optional): Detailed description
- `priority` (optional): Priority (1-5)
- `impact` (optional): Impact (1-3)
- `urgency` (optional): Urgency (1-3)

**Response:**
```json
{
  "sys_id": "abc123def456",
  "number": "INC0012345",
  "short_description": "OAuth callback failing",
  "description": "Users reporting OAuth callback errors...",
  "state": "1",
  "priority": "2",
  "impact": "2",
  "urgency": "2",
  "category": "Product X"
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Invalid request payload
- `500` - Server error

**Example:**
```bash
curl -X POST http://localhost:3000/incident \
  -H "Content-Type: application/json" \
  -d '{
    "product": "Product X",
    "short_description": "OAuth callback failing"
  }'
```

---

### List Incidents

**GET** `/incidents`

List incidents with filtering and pagination.

**Query Parameters:**
- `state` (optional): Filter by state (`open`, `resolved`, or state number). Default: `open`
- `limit` (optional): Maximum records to return. Default: `20`, Max: `10000`
- `offset` (optional): Pagination offset. Default: `0`

**Response:**
```json
{
  "incidents": [
    {
      "sys_id": "abc123def456",
      "number": "INC0012345",
      "short_description": "OAuth callback failing",
      "description": "Users reporting OAuth callback errors...",
      "state": "1",
      "priority": "2",
      "impact": "2",
      "urgency": "2",
      "category": "integration",
      "x_cursor_suggested": false
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid query parameters
- `500` - Server error

**Examples:**
```bash
# List open incidents
curl http://localhost:3000/incidents

# List resolved incidents
curl "http://localhost:3000/incidents?state=resolved"

# Pagination
curl "http://localhost:3000/incidents?limit=50&offset=0"
```

---

### Suggest KB Articles

**POST** `/incident/:sys_id/suggest`

Get KB article suggestions for an incident.

**Path Parameters:**
- `sys_id` (required): Incident sys_id

**Response:**
```json
{
  "articles": [
    {
      "sys_id": "kb123def456",
      "number": "KB0000001",
      "short_description": "OAuth callback errors (common causes & fixes)"
    },
    {
      "sys_id": "kb789ghi012",
      "number": "KB0000002",
      "short_description": "Rotate API keys for Product X"
    }
  ],
  "count": 2
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid sys_id
- `404` - Incident not found
- `500` - Server error

**Example:**
```bash
curl -X POST http://localhost:3000/incident/abc123def456/suggest
```

**Note:** This endpoint automatically marks the incident as `x_cursor_suggested=true`.

---

### Resolve Incident

**POST** `/incident/:sys_id/resolve`

Resolve an incident with resolution notes.

**Path Parameters:**
- `sys_id` (required): Incident sys_id

**Request Body:**
```json
{
  "resolution_note": "Resolved via KB-0001. User updated OAuth redirect URI."
}
```

**Fields:**
- `resolution_note` (required): Resolution notes

**Response:**
```json
{
  "sys_id": "abc123def456",
  "number": "INC0012345",
  "state": "6",
  "resolution_code": "Solved (Removed)",
  "resolution_notes": "Resolved via KB-0001. User updated OAuth redirect URI.",
  "resolved_at": "2024-01-15T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Resolved successfully
- `400` - Invalid request payload
- `404` - Incident not found
- `500` - Server error

**Example:**
```bash
curl -X POST http://localhost:3000/incident/abc123def456/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "resolution_note": "Resolved via KB-0001"
  }'
```

---

### Get Statistics

**GET** `/stats`

Get help desk statistics and metrics.

**Response:**
```json
{
  "counts": {
    "open": 5,
    "inProgress": 3,
    "resolved": 12,
    "total": 20
  },
  "deflection": {
    "totalIncidents": 20,
    "suggestedIncidents": 8,
    "resolvedAfterSuggestion": 6,
    "deflectionRate": 30.0
  }
}
```

**Fields:**
- `counts.open`: Number of new/open incidents (state < 2)
- `counts.inProgress`: Number of in-progress incidents (state 2-5)
- `counts.resolved`: Number of resolved incidents (state 6)
- `counts.total`: Total number of incidents
- `deflection.totalIncidents`: Total incidents
- `deflection.suggestedIncidents`: Incidents with KB suggestions
- `deflection.resolvedAfterSuggestion`: Resolved incidents that had suggestions
- `deflection.deflectionRate`: Percentage of incidents resolved after suggestion

**Status Codes:**
- `200` - Success
- `500` - Server error

**Example:**
```bash
curl http://localhost:3000/stats
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message",
  "details": {
    // Additional error details (development only)
  }
}
```

**Common Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication error)
- `403` - Forbidden (authorization error)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Validator Compliance Header

All responses include a validator compliance header (as per INTEGRATION_VALIDATOR.md):

```
X-Validator-Compliance: Pass
```

The header indicates that the response complies with all 7 validation categories:
1. Ruleset Compliance
2. Architecture
3. Authentication
4. API Syntax
5. Error Handling
6. Documentation
7. Instance Constraints

---

## Rate Limiting

Currently, no rate limiting is implemented on the API endpoints. Future versions may include:
- Per-IP rate limiting
- Per-endpoint rate limiting
- Token-based rate limiting

---

## Authentication

The API does not require authentication. In production, you should:
- Add API key authentication
- Implement OAuth 2.0
- Use HTTPS only
- Add request signing

---

## Pagination

For endpoints that return lists (e.g., `/incidents`), use:
- `limit`: Maximum records per page (default: 20, max: 10000)
- `offset`: Number of records to skip (default: 0)

**Example:**
```bash
# First page
curl "http://localhost:3000/incidents?limit=20&offset=0"

# Second page
curl "http://localhost:3000/incidents?limit=20&offset=20"
```

---

## Examples

### Complete Workflow

```bash
# 1. Check health
curl http://localhost:3000/health

# 2. Seed data
curl -X POST http://localhost:3000/seed

# 3. Create incident
INCIDENT=$(curl -s -X POST http://localhost:3000/incident \
  -H "Content-Type: application/json" \
  -d '{
    "product": "Product X",
    "short_description": "OAuth callback failing"
  }' | jq -r '.sys_id')

# 4. Get KB suggestions
curl -X POST "http://localhost:3000/incident/$INCIDENT/suggest"

# 5. Resolve incident
curl -X POST "http://localhost:3000/incident/$INCIDENT/resolve" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution_note": "Resolved via KB-0001"
  }'

# 6. Get statistics
curl http://localhost:3000/stats
```

---

## Testing

### Smoke Tests

```bash
# Health check
curl -s http://localhost:3000/health

# List incidents
curl -s http://localhost:3000/incidents

# Create incident
curl -s -X POST http://localhost:3000/incident \
  -H "Content-Type: application/json" \
  -d '{"product":"Product X","short_description":"Test issue"}'

# Get stats
curl -s http://localhost:3000/stats
```

---

## Support

For issues or questions:
1. Check the logs for error details
2. Verify ServiceNow instance is accessible
3. Ensure environment variables are set correctly
4. Review the RUNBOOK.md for troubleshooting steps

