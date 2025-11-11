# Architecture Overview

This document describes the architecture of the Docs & Integrations Help Desk, including module structure, request flow, and design decisions.

---

## Module Map

```
servicenow-playground/
├── config/
│   └── env.ts                    # Environment configuration with Zod validation
├── src/
│   ├── index.ts                   # HTTP server entry point
│   ├── clients/
│   │   └── servicenow.ts         # ServiceNow Table API client
│   ├── utils/
│   │   ├── logger.ts             # Logging utility with secret redaction
│   │   ├── retry.ts              # Retry logic with exponential backoff
│   │   └── validation.ts         # Zod validation schemas
│   ├── seed/
│   │   └── seed-docsdesk.ts      # Seed script for KB articles and incidents
│   └── docsdesk/
│       ├── intake.ts             # Incident creation and listing
│       ├── kb.ts                 # KB article suggestions
│       ├── resolve.ts            # Incident resolution
│       └── stats.ts              # Statistics and metrics
└── docs/
    ├── SERVICE_NOW.md            # ServiceNow integration guide
    ├── ARCHITECTURE.md           # This file
    ├── API_REFERENCE.md          # API endpoint documentation
    └── RUNBOOK.md                # Operational runbook
```

---

## DAP Structure Compliance

The project follows the Default Architectural Profile (DAP v1.0):

- **Runtime**: TypeScript + Node.js 18+
- **Package Manager**: pnpm
- **Module Resolution**: node16
- **Strict Mode**: Enabled
- **Target**: ES2021

---

## Request Flow

### 1. Incident Intake Flow

```
Client Request
    ↓
HTTP Server (index.ts)
    ↓
Validation (validation.ts)
    ↓
Intake Module (intake.ts)
    ↓
ServiceNow Client (servicenow.ts)
    ↓
Retry Logic (retry.ts) [if 429/5xx]
    ↓
ServiceNow Table API
    ↓
Response → Client
```

### 2. KB Suggestion Flow

```
Client Request: POST /incident/:sys_id/suggest
    ↓
HTTP Server (index.ts)
    ↓
KB Module (kb.ts)
    ↓
1. Fetch incident details
    ↓
2. Extract keywords from description
    ↓
3. Query KB articles (servicenow.ts)
    ↓
4. Mark incident as suggested
    ↓
5. Return top 3 articles
```

### 3. Resolution Flow

```
Client Request: POST /incident/:sys_id/resolve
    ↓
HTTP Server (index.ts)
    ↓
Validation (validation.ts)
    ↓
Resolve Module (resolve.ts)
    ↓
ServiceNow Client (servicenow.ts)
    ↓
PATCH incident (state=6, resolution_notes)
    ↓
Response → Client
```

### 4. Statistics Flow

```
Client Request: GET /stats
    ↓
HTTP Server (index.ts)
    ↓
Stats Module (stats.ts)
    ↓
1. Fetch all incidents (with pagination)
    ↓
2. Count by state
    ↓
3. Calculate deflection metrics
    ↓
4. Return aggregated stats
```

---

## Component Responsibilities

### Configuration (`config/env.ts`)

- Loads and validates environment variables using Zod
- Provides typed `Config` object
- Exits process if required variables are missing
- Supports multiple auth modes (basic, oauth, apiKey)

### ServiceNow Client (`src/clients/servicenow.ts`)

- Wraps ServiceNow Table API
- Handles authentication (Basic, OAuth, API Key)
- Implements retry logic for 429/5xx errors
- Provides typed methods: `getTable`, `create`, `patch`, `del`
- Builds query strings and handles pagination

### Utilities

#### Logger (`src/utils/logger.ts`)
- Development: Human-readable console logs
- Production: JSON-formatted logs
- Automatically redacts secrets (passwords, tokens, etc.)

#### Retry (`src/utils/retry.ts`)
- Exponential backoff with jitter
- Only retries on 429/5xx errors
- Never retries on 4xx errors
- Configurable: base delay, factor, max attempts, jitter

#### Validation (`src/utils/validation.ts`)
- Zod schemas for all input validation
- `IncidentCreateSchema` - Incident creation payload
- `SuggestRequestSchema` - KB suggestion request
- `ResolveRequestSchema` - Incident resolution request
- `ListIncidentsQuerySchema` - Query parameters

### Help Desk Modules

#### Intake (`src/docsdesk/intake.ts`)
- `createIncident()` - Creates new incidents
- `listIncidents()` - Lists incidents with filtering and pagination

#### KB (`src/docsdesk/kb.ts`)
- `suggestArticles()` - Suggests KB articles based on incident description
- Keyword extraction from incident text
- ServiceNow query building for KB search
- Marks incident as `x_cursor_suggested=true`

#### Resolve (`src/docsdesk/resolve.ts`)
- `resolveIncident()` - Closes incidents with resolution notes
- Sets state to 6 (Resolved)
- Adds resolution timestamp

#### Stats (`src/docsdesk/stats.ts`)
- `getStats()` - Calculates help desk metrics
- Counts by state (open, in-progress, resolved)
- Calculates deflection rate (resolved after suggestion / total)

### Seed Script (`src/seed/seed-docsdesk.ts`)

- Seeds 4 KB articles (realistic content)
- Seeds 10 incidents (various states, priorities)
- Idempotent: checks for existing records before creating
- Can be run multiple times safely

### HTTP Server (`src/index.ts`)

- Express.js server
- All routes include validator compliance header
- Error handling middleware
- Request validation using Zod schemas
- Secret redaction in error responses

---

## Design Decisions

### 1. Modular Architecture

Each module has a single responsibility:
- Separation of concerns
- Easy testing
- Hot-swappable components

### 2. Type Safety

- TypeScript with strict mode
- Zod for runtime validation
- Typed ServiceNow client responses

### 3. Error Handling

- Retry only for retryable errors (429/5xx)
- Never retry client errors (4xx)
- Comprehensive logging with secret redaction

### 4. Authentication

- Switchable auth modes (basic, oauth, apiKey)
- Default to Basic Auth (lowest friction)
- All credentials from environment variables

### 5. Pagination

- Respects 10,000 record limit
- Uses `sysparm_limit` and `sysparm_offset`
- Supports incremental syncs with `sys_updated_on`

### 6. Idempotency

- Seed script checks for existing records
- Safe to run multiple times
- No duplicate data

---

## Data Flow Example

### Creating an Incident

1. **Client** sends POST `/incident` with payload
2. **Server** validates payload using `IncidentCreateSchema`
3. **Intake module** calls `createIncident()`
4. **ServiceNow client** builds request:
   - URL: `https://instance.service-now.com/api/now/table/incident`
   - Method: POST
   - Headers: Authorization, User-Agent, Content-Type
   - Body: Validated payload
5. **Retry logic** handles 429/5xx errors automatically
6. **ServiceNow** returns created incident
7. **Response** sent to client with validator header

### Suggesting KB Articles

1. **Client** sends POST `/incident/:sys_id/suggest`
2. **KB module** fetches incident details
3. **Keyword extraction** from `short_description` and `description`
4. **Query building** for KB articles:
   - `sysparm_query=active=true^short_descriptionLIKEkeyword^ORtextLIKEkeyword`
5. **ServiceNow client** queries `kb_knowledge` table
6. **Incident update** sets `x_cursor_suggested=true`
7. **Response** returns top 3 articles

---

## Security Considerations

1. **Secret Redaction**: All logs redact passwords, tokens, secrets
2. **Environment Variables**: No hardcoded credentials
3. **Input Validation**: All inputs validated with Zod
4. **Error Messages**: Production errors don't expose internals
5. **Least Privilege**: Uses `web_service_admin` + specific roles (not global admin)

---

## Testing Strategy

1. **Unit Tests**: Test individual modules in isolation
2. **Integration Tests**: Test ServiceNow client with mock responses
3. **E2E Tests**: Test full request flows
4. **Seed Script**: Provides test data for development

---

## Future Enhancements

- Webhook support for real-time updates
- Caching layer for KB articles
- Rate limiting on API endpoints
- Metrics dashboard
- Batch operations for bulk updates

