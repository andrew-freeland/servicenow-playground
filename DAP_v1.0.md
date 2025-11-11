# Default Architectural Profile (DAP v1.0)

This profile defines the baseline choices you must use for all ServiceNow-related development unless the user explicitly overrides them.

Use the DAP in combination with the Validator and the Ruleset.

---

## ✅ 1. Runtime Environment Defaults

**Primary language:** TypeScript

**Runtime:** Node.js 18+

**Package manager:** pnpm (use npm only if user requests)

**TS configuration:**
- `"strict": true`
- `"moduleResolution": "node16"`
- `"target": "ES2021"`

---

## ✅ 2. Project Structure Defaults

### Core Directories

```
/src
  /clients
     servicenow.ts
  /seed
     seed.ts
  /reports
     reports.ts
  /webhooks
     inbound.ts
     outbound.ts
  /utils
     logger.ts
     retry.ts
     validation.ts
/config
  env.ts
/docs
  SERVICE_NOW.md
  ARCHITECTURE.md
  API_REFERENCE.md
```

### Index Files

- `/src/index.ts` = Entry point
- `/config/env.ts` = Environment loader using zod

---

## ✅ 3. Naming Conventions

- **Filenames:** kebab-case.ts
- **Exported classes:** PascalCase
- **Functions:** camelCase
- **Interfaces:** IPascalCase
- **Environment variables:** UPPERCASE_SNAKE_CASE

---

## ✅ 4. Default Authentication Method

Unless user specifies otherwise:

- Use **Basic Auth** to start (lowest friction)
- Expose a switchable interface so OAuth2 can be added later:
  - `auth: "basic" | "oauth" | "apiKey"`

---

## ✅ 5. Default Retry Logic

Always use:

- **Exponential backoff**
- **Base delay:** 500ms
- **Factor:** 2
- **Max attempts:** 5
- **Jitter:** enabled (±15%)

---

## ✅ 6. Default Logging Strategy

- **Console logging** during development
- **JSON-formatted logs** in production mode
- All secrets must be redacted:
  - Replace with `"***REDACTED***"`

---

## ✅ 7. Default Table & Scenario

If user does not specify:

- **Default table:** `incident`
- **Default fields used:**
  - `short_description`
  - `description`
  - `priority`
  - `impact`
  - `urgency`
  - `assigned_to`
- **Default example workflows:**
  - Seed 10 incidents
  - Pull first 20 open incidents
  - Update a single incident
  - Delete a test incident

These are compliant with PDIs and support rapid prototyping.

---

## ✅ 8. Default Documentation Requirements

Every generated integration must include:

- Overview
- Prerequisites
- Environment Variables
- How Authentication Works
- API Endpoints
- Testing
- Known PDI Limitations
- Reset/Recovery Steps

---

## ✅ 9. Absolute Constraints

Cursor must never:

- Introduce enterprise-only features
- Enable plugins automatically
- Create ServiceNow tables via API
- Assume IntegrationHub is installed
- Assume UI workflows are active

---

## ✅ 10. After assimilating this DAP

Cursor must respond with:

**"DAP v1.0 successfully assimilated — baseline scaffolding and design defaults ready."**

