# ServiceNow Integration Playground

A comprehensive foundation for building compliant, production-ready integrations with ServiceNow Developer Instances (PDIs). This repository provides canonical rules, validation protocols, and enforcement mechanisms to ensure all ServiceNow integrations follow best practices, security standards, and platform constraints.

## 🎯 Docs & Integrations Help Desk

This repository includes a working **Docs & Integrations Help Desk** demo application that demonstrates:
- Incident intake and management
- KB article suggestions based on incident descriptions
- Incident resolution tracking
- Help desk statistics and deflection metrics

### Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your ServiceNow PDI credentials

# 3. Seed data
pnpm seed

# 4. Start development server
pnpm dev
```

The server will start on `http://localhost:3000` (or port specified in `PORT`).

### cURL Smoke Tests

```bash
# Health check
curl -s http://localhost:3000/health

# List incidents
curl -s http://localhost:3000/incidents

# Create incident
curl -s -X POST http://localhost:3000/incident \
  -H "Content-Type: application/json" \
  -d '{"product":"Product X","short_description":"OAuth callback failing"}'

# Get KB suggestions (replace <SYS_ID> with actual incident sys_id)
curl -s -X POST http://localhost:3000/incident/<SYS_ID>/suggest

# Resolve incident (replace <SYS_ID> with actual incident sys_id)
curl -s -X POST http://localhost:3000/incident/<SYS_ID>/resolve \
  -H "Content-Type: application/json" \
  -d '{"resolution_note":"Resolved via KB-0001"}'

# Get statistics
curl -s http://localhost:3000/stats
```

### Documentation

- **[API Reference](docs/API_REFERENCE.md)** - Complete API endpoint documentation
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture and design decisions
- **[ServiceNow Integration](docs/SERVICE_NOW.md)** - ServiceNow API usage patterns
- **[Runbook](docs/RUNBOOK.md)** - Operational guide and troubleshooting

---

## 📚 Repository Overview

This repository contains three core documents that work together to establish a complete integration framework:

1. **Integration Ruleset v1.0** - The canonical knowledge base defining all ServiceNow integration rules
2. **INTEGRATION_VALIDATOR.md** - The enforcement layer ("The Enforcer") with validation checklists
3. **VALIDATOR_META_CONTEXT.md** - Meta-principles explaining how to interpret and apply the validator

---

## 🏗️ Architecture & Document Relationships

```mermaid
graph TB
    subgraph "Foundation Layer"
        A[Integration Ruleset v1.0<br/>Canonical Knowledge Base<br/>The Law]
    end
    
    subgraph "Enforcement Layer"
        B[INTEGRATION_VALIDATOR.md<br/>The Enforcer<br/>Runtime Guardrails]
        C[VALIDATOR_META_CONTEXT.md<br/>Meta-Principles<br/>Interpretation Guide]
    end
    
    subgraph "Application Layer"
        D[ServiceNow Integration Code<br/>TypeScript/Node.js]
        E[API Wrappers<br/>/src/servicenow.ts]
        F[Seed Generators<br/>/src/seed.ts]
        G[Report Pullers<br/>/src/reports.ts]
        H[Webhook Handlers<br/>/src/webhooks/]
    end
    
    A -->|Defines Rules| B
    A -->|Takes Priority| C
    C -->|Interprets| B
    B -->|Validates| D
    D --> E
    D --> F
    D --> G
    D --> H
    
    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#fff4e1
    style D fill:#e8f5e9
    style E fill:#e8f5e9
    style F fill:#e8f5e9
    style G fill:#e8f5e9
    style H fill:#e8f5e9
```

---

## 🔄 Validation Flow Process

```mermaid
flowchart TD
    Start[ServiceNow Request Received] --> Check{Is this<br/>ServiceNow-related?}
    Check -->|No| NormalResponse[Normal Response<br/>No Validation]
    Check -->|Yes| Validate[Run 7-Category Validation]
    
    Validate --> V1[1. Ruleset Compliance]
    Validate --> V2[2. Architecture & Modularity]
    Validate --> V3[3. Authentication]
    Validate --> V4[4. API Syntax]
    Validate --> V5[5. Error Handling]
    Validate --> V6[6. Documentation]
    Validate --> V7[7. Instance Constraints]
    
    V1 --> AllPass{All Categories<br/>Pass?}
    V2 --> AllPass
    V3 --> AllPass
    V4 --> AllPass
    V5 --> AllPass
    V6 --> AllPass
    V7 --> AllPass
    
    AllPass -->|Yes| OutputHeader[Output Validation Header<br/>with Pass Status]
    AllPass -->|No| Stop[STOP Execution]
    
    Stop --> Explain[Explain Violations]
    Explain --> Suggest[Suggest Compliant Alternatives]
    Suggest --> Wait[Wait for User Approval]
    
    OutputHeader --> FinalOutput[--- FINAL OUTPUT BELOW THIS LINE ---<br/>Generated Code/Instructions]
    
    style Start fill:#e3f2fd
    style Validate fill:#fff9c4
    style AllPass fill:#c8e6c9
    style Stop fill:#ffcdd2
    style FinalOutput fill:#e8f5e9
```

---

## 🎯 Integration Architecture Pattern

```mermaid
graph LR
    subgraph "Local Environment"
        A[Environment Variables<br/>or GCP Secret Manager]
        B[config.ts<br/>Environment Config]
        C[ServiceNowClient<br/>API Wrapper]
    end
    
    subgraph "ServiceNow PDI"
        D[Table API<br/>/api/now/table/]
        E[Scripted REST API<br/>Custom Endpoints]
        F[Import Set API<br/>Bulk Ingestion]
    end
    
    subgraph "Integration Components"
        G[/src/servicenow.ts<br/>API Wrapper]
        H[/src/seed.ts<br/>Test Data Generators]
        I[/src/reports.ts<br/>Report Pullers]
        J[/src/webhooks/<br/>Outbound Handlers]
    end
    
    A --> B
    B --> C
    C --> G
    G --> D
    G --> E
    G --> F
    
    G --> H
    G --> I
    G --> J
    
    style A fill:#ffebee
    style B fill:#e1f5ff
    style C fill:#e8f5e9
    style D fill:#fff9c4
    style E fill:#fff9c4
    style F fill:#fff9c4
    style G fill:#e8f5e9
    style H fill:#e8f5e9
    style I fill:#e8f5e9
    style J fill:#e8f5e9
```

---

## 📋 Validation Categories

```mermaid
mindmap
  root((ServiceNow<br/>Validation))
    Ruleset Compliance
      Aligns with v1.0
      No violations
      Stop on conflict
    Architecture
      Modular structure
      TypeScript + Zod/Joi
      Hot-swappable clients
      Environment variables
    Authentication
      Basic/OAuth/API Key
      Standard env vars
      Least privilege roles
      Secure storage
    API Syntax
      Correct URL structure
      Query parameters
      Pagination
      User-Agent header
      PATCH for updates
    Error Handling
      Retry 429/5xx
      No retry 4xx
      Exponential backoff
      Capped retries
      Secret redaction
    Documentation
      Credentials list
      API endpoints
      Retry logic
      Output format
      Required plugins/roles
    Instance Constraints
      PDI compatible
      Ephemeral data
      10-min shutdown
      7-day reset cycle
      No enterprise features
```

---

## 🔐 Authentication Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Env as Environment Variables
    participant Client as ServiceNowClient
    participant SN as ServiceNow PDI
    
    Dev->>Env: Set credentials<br/>(SERVICE_NOW_INSTANCE,<br/>SERVICE_NOW_USER, etc.)
    Dev->>Client: Initialize with env vars
    Client->>Client: Validate credentials present
    Client->>SN: API Request<br/>(Basic Auth/OAuth/API Key)
    SN->>Client: Response (200/429/4xx/5xx)
    
    alt HTTP 429 or 5xx
        Client->>Client: Exponential Backoff
        Client->>SN: Retry Request
    else HTTP 4xx
        Client->>Client: Log Error (No Retry)
        Client->>Dev: Return Error
    else HTTP 200
        Client->>Dev: Return Data
    end
```

---

## 📦 What's Included

### Core Documents

| Document | Purpose | Role |
|----------|---------|------|
| **Integration Ruleset v1.0** | Canonical knowledge base | Defines all rules, constraints, and best practices |
| **INTEGRATION_VALIDATOR.md** | Validation checklist | Enforces ruleset compliance before code generation |
| **VALIDATOR_META_CONTEXT.md** | Interpretation guide | Explains how to apply the validator correctly |

### Key Features

✅ **Comprehensive Ruleset** - Complete coverage of authentication, API usage, rate limiting, and best practices  
✅ **Automated Validation** - 7-category validation ensures compliance before code generation  
✅ **No Assumptions Policy** - Always asks for clarification rather than guessing  
✅ **PDI-Optimized** - Designed specifically for Personal Developer Instances  
✅ **Security-First** - Enforces least-privilege access and secure credential storage  
✅ **Modular Architecture** - Prescribes clean, testable, maintainable code structure  

---

## 🚀 Quick Start

### 1. Understand the Foundation

Read the documents in this order:
1. **Integration Ruleset v1.0** - Learn the rules
2. **VALIDATOR_META_CONTEXT.md** - Understand how to apply them
3. **INTEGRATION_VALIDATOR.md** - See the validation checklist

### 2. Set Up Environment

Create a `.env` file with required credentials:

```bash
SERVICE_NOW_INSTANCE=your-instance.service-now.com
SERVICE_NOW_USER=your-username
SERVICE_NOW_PASSWORD=your-password
# OR for OAuth:
# SERVICE_NOW_CLIENT_ID=your-client-id
# SERVICE_NOW_CLIENT_SECRET=your-client-secret
```

### 3. Build Your Integration

Follow the prescribed architecture:
- `/src/servicenow.ts` - API wrapper
- `/src/seed.ts` - Test data generators
- `/src/reports.ts` - Report pullers
- `/src/webhooks/` - Outbound handlers

### 4. Validate Before Deploying

All code must pass the 7-category validation before being considered production-ready.

---

## 📖 Document Details

### Integration Ruleset v1.0

The canonical source of truth covering:
- **Authentication & Security** - Auth types, credential storage, role requirements
- **Rate Limiting & Retries** - Exponential backoff, error handling strategies
- **API Usage Rules** - Table API, Scripted REST API, Import Set API
- **Best Practices** - Code structure, modularity, testing strategies
- **Instance Constraints** - PDI limitations, plugin management, ephemeral data

### INTEGRATION_VALIDATOR.md

The enforcement layer with 7 validation categories:
1. **Ruleset Compliance** - Ensures alignment with v1.0
2. **Architecture & Modularity** - Verifies code structure
3. **Authentication** - Validates auth patterns and credentials
4. **API Syntax** - Checks API usage correctness
5. **Error Handling** - Ensures proper retry logic
6. **Documentation** - Verifies required documentation
7. **Instance Constraints** - Confirms PDI compatibility

### VALIDATOR_META_CONTEXT.md

Meta-principles explaining:
- Document hierarchy and relationships
- Enforcement behavior
- No-assumptions policy
- Clarification protocols
- Output format requirements
- Scope of application

---

## 🎓 Usage in AI Development

When using this repository with AI coding assistants (like Cursor):

1. **Load the Ruleset** - Provide "Integration Ruleset v1.0" as system context
2. **Activate the Validator** - Include "INTEGRATION_VALIDATOR.md" as enforcement layer
3. **Apply Meta-Context** - Use "VALIDATOR_META_CONTEXT.md" for interpretation
4. **Request ServiceNow Work** - AI will automatically validate all outputs

The AI will:
- ✅ Run 7-category validation before returning code
- ✅ Stop and explain if validation fails
- ✅ Ask for clarification when information is missing
- ✅ Never assume ServiceNow features exist
- ✅ Follow all ruleset guidelines automatically

---

## 🔒 Security & Best Practices

### Credential Management
- ❌ Never hardcode credentials
- ✅ Use environment variables or GCP Secret Manager
- ✅ Follow standard naming conventions
- ✅ Redact secrets in logs

### Access Control
- ❌ Never use global admin role
- ✅ Use service account with `web_service_admin` + specific roles
- ✅ Apply least-privilege principle

### Error Handling
- ✅ Retry with exponential backoff for 429/5xx
- ❌ Never retry 4xx client errors
- ✅ Cap retry attempts
- ✅ Log all failures with redacted secrets

---

## 📊 Supported APIs

| API | Description | Use Case |
|-----|-------------|----------|
| **Table API** | Full CRUD operations | Standard record management |
| **Scripted REST API** | Custom endpoints | Custom business logic |
| **Import Set API** | Bulk ingestion | Large data imports |

---

## ⚠️ PDI Constraints

ServiceNow Personal Developer Instances have specific limitations:

- **Inactivity Shutdown** - Automatically shuts down after 10 minutes of inactivity
- **Reset Cycle** - Resets if not accessed within 7 days
- **Ephemeral Data** - All data is temporary and may be lost
- **Plugin Activation** - Plugins must be manually enabled (cannot be done via API)
- **No Rate Limits** - No fixed global rate limits, but may return 429 if configured

---

## 🤝 Contributing

This is a foundational ruleset. When updating:

1. **Ruleset v1.0** takes priority over validator
2. If conflicts arise, update the appropriate document
3. Maintain backward compatibility when possible
4. Document all changes clearly

---

## 📝 License

This repository contains documentation and rules for ServiceNow integration development. Use freely for your ServiceNow integration projects.

---

## 🔗 Related Resources

- [ServiceNow Developer Portal](https://developer.servicenow.com/)
- [ServiceNow API Documentation](https://docs.servicenow.com/)
- [ServiceNow REST API Explorer](https://docs.servicenow.com/bundle/vancouver-application-development/page/integrate/inbound-rest/concept/c_RESTAPI.html)

---

## ✅ Status

**Foundation Complete** - All core documents created and validated. Ready for ServiceNow-compliant integration development.

---

*Last Updated: 2024*

