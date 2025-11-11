# Runbook

Operational guide for running and maintaining the Docs & Integrations Help Desk.

---

## Prerequisites

### ServiceNow PDI Setup

1. **Create ServiceNow PDI**
   - Sign up at [developer.servicenow.com](https://developer.servicenow.com)
   - Create a Personal Developer Instance (PDI)

2. **Create Service Account User**
   - Navigate to **User Administration > Users**
   - Create a new user (e.g., `sn_api`)
   - Set password (save for environment variables)

3. **Assign Roles**
   - Navigate to **User Administration > Users**
   - Select the service account user
   - Add roles:
     - `web_service_admin` (required for API access)
     - `itil` (required for incident table access)
     - `kb_admin` or `kb_knowledge_base` (required for KB article access)
   - **Never use `admin` role** unless explicitly required

4. **Create Custom Field (Optional)**
   - Navigate to **System Definition > Tables**
   - Open `incident` table
   - Create new field: `x_cursor_suggested` (type: Boolean)
   - Add to form if needed

---

## Local Setup

### 1. Install Dependencies

```bash
# Install pnpm (if not already installed)
npm install -g pnpm

# Install project dependencies
pnpm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your ServiceNow credentials:

```env
SERVICE_NOW_INSTANCE=https://dev12345.service-now.com
SERVICE_NOW_USER=sn_api
SERVICE_NOW_PASSWORD=your-password
PORT=3000
NODE_ENV=development
AUTH_MODE=basic
```

**Important:** Never commit `.env` to version control.

### 3. Verify Configuration

```bash
# Type check
pnpm typecheck

# Build
pnpm build
```

---

## Running the Application

### Development Mode

```bash
pnpm dev
```

Server starts on `http://localhost:3000` (or port specified in `PORT`).

### Production Mode

```bash
# Build
pnpm build

# Start
pnpm start
```

### Seed Data

```bash
pnpm seed
```

This seeds:
- 4 KB articles
- 10 incidents

**Note:** Idempotent - safe to run multiple times.

---

## Common Operations

### Check Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok"}
```

### Create an Incident

```bash
curl -X POST http://localhost:3000/incident \
  -H "Content-Type: application/json" \
  -d '{
    "product": "Product X",
    "short_description": "OAuth callback failing"
  }'
```

### List Incidents

```bash
curl http://localhost:3000/incidents
```

### Get KB Suggestions

```bash
curl -X POST http://localhost:3000/incident/<SYS_ID>/suggest
```

### Resolve Incident

```bash
curl -X POST http://localhost:3000/incident/<SYS_ID>/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "resolution_note": "Resolved via KB-0001"
  }'
```

### Get Statistics

```bash
curl http://localhost:3000/stats
```

---

## Troubleshooting

### 401 Unauthorized

**Symptoms:**
- API calls return 401
- Error: "User not authenticated"

**Solutions:**
1. Verify credentials in `.env`:
   ```bash
   echo $SERVICE_NOW_USER
   echo $SERVICE_NOW_PASSWORD
   ```

2. Test credentials manually:
   ```bash
   curl -u "$SERVICE_NOW_USER:$SERVICE_NOW_PASSWORD" \
     "$SERVICE_NOW_INSTANCE/api/now/table/incident?sysparm_limit=1"
   ```

3. Check user roles in ServiceNow:
   - User must have `web_service_admin` role
   - User must have `itil` role for incident access

4. Verify instance URL format:
   - Should be: `https://dev12345.service-now.com`
   - No trailing slash

### 403 Forbidden

**Symptoms:**
- API calls return 403
- Error: "Access denied"

**Solutions:**
1. Verify user has required roles:
   - `web_service_admin` (for API access)
   - `itil` (for incident table)
   - `kb_admin` or `kb_knowledge_base` (for KB articles)

2. Check table-level ACLs in ServiceNow:
   - Navigate to **System Security > ACLs**
   - Verify ACLs allow API access

3. Check if PDI is active:
   - PDIs shut down after 10 minutes of inactivity
   - Access the PDI in browser to wake it up

### 429 Too Many Requests

**Symptoms:**
- API calls return 429
- Error: "Too Many Requests"

**Solutions:**
1. Retry logic should handle this automatically
2. Reduce request frequency
3. Use pagination to limit records per call
4. Wait a few minutes before retrying

### 500 Server Error

**Symptoms:**
- API calls return 500
- Error: "Internal server error"

**Solutions:**
1. Check ServiceNow instance status:
   - Access PDI in browser
   - Verify instance is active

2. Check ServiceNow logs (if accessible):
   - Navigate to **System Logs > System Log**

3. Verify PDI hasn't reset:
   - PDIs reset if not accessed within 7 days
   - May need to recreate data

4. Check application logs:
   ```bash
   # Check for errors in console output
   # Or review log files if configured
   ```

### Connection Timeout

**Symptoms:**
- Requests timeout
- Error: "ECONNREFUSED" or "ETIMEDOUT"

**Solutions:**
1. Verify PDI is active:
   - Access PDI in browser
   - PDIs shut down after 10 minutes of inactivity

2. Check network connectivity:
   ```bash
   ping dev12345.service-now.com
   ```

3. Verify instance URL is correct:
   - Should be: `https://dev12345.service-now.com`
   - No `http://` (must be HTTPS)

### Seed Script Fails

**Symptoms:**
- Seed script errors
- No data created

**Solutions:**
1. Check ServiceNow connection:
   ```bash
   curl -u "$SERVICE_NOW_USER:$SERVICE_NOW_PASSWORD" \
     "$SERVICE_NOW_INSTANCE/api/now/table/incident?sysparm_limit=1"
   ```

2. Verify user has create permissions:
   - User must have `itil` role
   - Check ACLs for `incident` and `kb_knowledge` tables

3. Check if records already exist:
   - Seed script is idempotent
   - May skip existing records

4. Review seed script logs:
   - Check console output for specific errors

### KB Articles Not Appearing in Queries

**Symptoms:**
- KB articles created but not returned in queries
- `suggestArticles()` returns empty results

**Solutions:**
1. **Check workflow state:**
   - Articles must be `workflow_state='published'` to be queryable
   - Check in ServiceNow: **Knowledge > Articles**
   - Verify articles are in "Published" state

2. **Verify knowledge base assignment:**
   - Articles must belong to a knowledge base (`kb_knowledge_base`)
   - Find KB base sys_id:
     ```bash
     # Via API
     curl -u "$SERVICE_NOW_USER:$SERVICE_NOW_PASSWORD" \
       "$SERVICE_NOW_INSTANCE/api/now/table/kb_knowledge_base?sysparm_query=title=IT"
     ```
   - Or in ServiceNow UI: **Knowledge > Knowledge Bases**
   - Default is usually "IT" knowledge base

3. **Check active status:**
   - Articles must have `active=true`
   - Verify in ServiceNow UI

4. **Verify valid_to date:**
   - Articles must have a future `valid_to` date
   - Check if articles have expired

5. **Check query syntax:**
   - Ensure query includes `active=true` and `workflow_state=published`
   - Example: `active=true^workflow_state=published^short_descriptionLIKEkeyword`

6. **Verify user roles:**
   - User needs `kb_admin` or `kb_knowledge_base` role
   - Check user roles in ServiceNow

**Finding KB Base sys_id:**
```bash
# Get all KB bases
curl -u "$SERVICE_NOW_USER:$SERVICE_NOW_PASSWORD" \
  "$SERVICE_NOW_INSTANCE/api/now/table/kb_knowledge_base?sysparm_fields=sys_id,title"

# Get specific KB base by name
curl -u "$SERVICE_NOW_USER:$SERVICE_NOW_PASSWORD" \
  "$SERVICE_NOW_INSTANCE/api/now/table/kb_knowledge_base?sysparm_query=title=IT&sysparm_fields=sys_id,title"
```

### Incident Close Codes

**Common Close Codes:**
- `Solved (Permanently)` - Issue resolved permanently
- `Solved (Removed)` - Issue resolved by removing the cause
- `Solved (Workaround)` - Issue resolved with a workaround
- `Not Solved (Not Reproducible)` - Issue cannot be reproduced
- `Not Solved (Duplicate)` - Duplicate of another incident
- `Not Solved (Not an Issue)` - Not actually an issue
- `Cancelled` - Incident cancelled

**Finding Available Close Codes:**
1. In ServiceNow UI:
   - Navigate to **System Definition > Choice Lists**
   - Search for `close_code` or `incident.close_code`
   - View available options

2. Via API:
   ```bash
   # Get close code choices (if accessible)
   curl -u "$SERVICE_NOW_USER:$SERVICE_NOW_PASSWORD" \
     "$SERVICE_NOW_INSTANCE/api/now/table/sys_choice?name=incident&element=close_code"
   ```

**Using Close Codes:**
- Always set `close_code` when resolving incidents
- Use `close_notes` for detailed resolution description
- Standard practice: `close_code='Solved (Permanently)'` for successful resolutions

**Note:** Close codes may vary by ServiceNow instance. Check your PDI for available options.

---

## Recovery Procedures

### Recover from 401/403

1. Verify credentials in `.env`
2. Test credentials manually (see above)
3. Check user roles in ServiceNow
4. Restart application:
   ```bash
   # Stop server (Ctrl+C)
   # Restart
   pnpm dev
   ```

### Recover from 429

1. Wait 1-2 minutes
2. Retry logic should handle automatically
3. Reduce request frequency if possible
4. Use smaller page sizes (limit parameter)

### Recover from PDI Shutdown

1. Access PDI in browser to wake it up
2. Wait 30-60 seconds for instance to start
3. Retry API calls
4. Consider implementing instance health checks

### Recover from Data Loss

PDIs reset if not accessed within 7 days. To recover:

1. Re-run seed script:
   ```bash
   pnpm seed
   ```

2. Verify data:
   ```bash
   curl http://localhost:3000/incidents
   curl http://localhost:3000/stats
   ```

### Cleanup and Reseed

To start fresh:

1. **Option 1: Delete via ServiceNow UI**
   - Navigate to incidents/KB articles
   - Delete test records manually

2. **Option 2: Reseed (Idempotent)**
   - Seed script checks for existing records
   - Safe to run multiple times
   ```bash
   pnpm seed
   ```

---

## Monitoring

### Health Checks

Set up periodic health checks:

```bash
# Cron job example (every 5 minutes)
*/5 * * * * curl -f http://localhost:3000/health || alert
```

### Log Monitoring

Monitor application logs for:
- Error rates
- 429 responses (rate limiting)
- 5xx responses (server errors)
- Authentication failures

### ServiceNow Monitoring

Monitor ServiceNow instance:
- PDI activity (10-minute shutdown)
- API usage
- Error logs

---

## Maintenance

### Regular Tasks

1. **Weekly:**
   - Verify PDI is active
   - Check for data loss (PDI resets)
   - Review error logs

2. **Monthly:**
   - Update dependencies:
     ```bash
     pnpm update
     ```
   - Review and update KB articles
   - Clean up old test incidents

### Backup Strategy

PDIs are ephemeral. For important data:
1. Export data via API
2. Store in version control (if appropriate)
3. Use seed scripts to recreate

---

## Performance Tuning

### Reduce API Calls

- Use pagination with appropriate limits
- Cache KB articles if possible
- Batch operations when possible

### Optimize Queries

- Use `sysparm_fields` to limit returned data
- Use specific queries instead of fetching all records
- Use incremental syncs with `sys_updated_on`

---

## Security Best Practices

1. **Never commit `.env` to version control**
2. **Use least-privilege roles** (not global admin)
3. **Rotate credentials regularly**
4. **Monitor for unauthorized access**
5. **Use HTTPS in production**
6. **Implement API authentication** (future enhancement)

---

## Support

For issues:
1. Check this runbook
2. Review SERVICE_NOW.md for API details
3. Check ServiceNow developer documentation
4. Review application logs

---

## Quick Reference

```bash
# Start development server
pnpm dev

# Seed data
pnpm seed

# Build for production
pnpm build

# Run production server
pnpm start

# Type check
pnpm typecheck

# Health check
curl http://localhost:3000/health

# List incidents
curl http://localhost:3000/incidents

# Get stats
curl http://localhost:3000/stats
```

