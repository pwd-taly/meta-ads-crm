# Phase 2.1: Observability & Monitoring - Design Specification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build self-hosted observability stack to monitor business metrics, job health, and API performance with alerts to Slack and email.

**Architecture:** Lightweight balanced approach using Prometheus for metrics, Grafana for visualization, structured JSON logging to files, and Grafana-native alerting. Optimized for single-server deployment with <50 organizations and <10k leads. Designed to upgrade to ELK stack later without rework.

**Tech Stack:** Prometheus (metrics), Grafana (dashboards/alerts), Winston/Pino (structured logging), prom-client (Node.js metrics), Docker Compose (container orchestration)

---

## Context & Constraints

**Deployment:** Single VPS/EC2 instance, self-hosted infrastructure
**Scale:** <50 organizations, <10k total leads, <1k daily requests
**Team:** Small team, likely solo monitoring configuration
**Priorities:** Business metrics > Job health > API performance
**Alerting:** Email + Slack (both channels)
**Future:** Easy upgrade path to ELK when scale increases

---

## System Architecture

### High-Level Flow

```
App (Next.js)
├── Emits metrics (via prom-client)
├── Writes structured logs (via Winston/Pino)
├── Exposes /api/metrics endpoint
│
├── Prometheus
│   ├── Scrapes /api/metrics every 15 seconds
│   └── Stores time-series data on disk
│
├── Grafana
│   ├── Queries Prometheus for dashboards
│   ├── Triggers alerts on thresholds
│   └── Sends to Slack webhook + Email
│
└── Logs
    ├── /var/log/meta-ads-crm/app.log
    ├── /var/log/meta-ads-crm/jobs.log
    ├── /var/log/meta-ads-crm/errors.log
    └── Daily rotation, 30-day retention
```

### Container Architecture

```
Single Server
├── Next.js App (port 3000)
├── Prometheus (port 9090, Docker)
├── Grafana (port 3001, Docker)
└── File system
    ├── /var/log/meta-ads-crm/ (logs)
    └── /var/lib/prometheus/ (metrics data)
```

### Deployment Method

Docker Compose orchestrates Prometheus and Grafana. Next.js app runs directly on host (existing setup). Logs written to host filesystem. This simplifies the stack while maintaining isolation.

---

## Metrics Definition

### Business Metrics

**Lead Scoring Metrics:**
- `leads_scored_total` — Counter. Total leads that have been scored (cumulative, never decreases)
- `leads_score_distribution` — Histogram. Distribution of AI scores (0-100), shows if scoring is biased
- `leads_by_status` — Gauge. Current count of leads in each status (new, contacted, booked, closed, lost)

**Follow-up Metrics:**
- `follow_ups_scheduled_total` — Counter. Cumulative follow-ups scheduled across all types
- `follow_ups_completed_total` — Counter. Cumulative follow-ups marked as sent
- `follow_ups_overdue_count` — Gauge. Current count of follow-ups past due date

**Campaign Performance Metrics:**
- `conversions_by_campaign` — Gauge. Current conversion count per campaign (tags: campaign_id, campaign_name)
- `campaign_roi_ratio` — Gauge. ROI per campaign (conversions / spend), tags: campaign_id
- `campaign_spend_total` — Counter. Total spend by campaign (accumulates with sync)

### Job Health Metrics

**Scoring Job:**
- `scoring_job_runs_total` — Counter. Total executions (success + failure)
- `scoring_job_successes_total` — Counter. Successful executions
- `scoring_job_failures_total` — Counter. Failed executions
- `scoring_job_duration_seconds` — Histogram. Execution time distribution (p50, p95, p99)
- `scoring_job_last_run_timestamp` — Gauge. Unix timestamp of last execution (for alerting on staleness)

**Campaign Sync Job:**
- `meta_sync_job_runs_total` — Counter. Total executions
- `meta_sync_job_successes_total` — Counter. Successful syncs
- `meta_sync_job_failures_total` — Counter. Failed syncs
- `meta_sync_job_duration_seconds` — Histogram. Execution time distribution
- `meta_sync_job_last_run_timestamp` — Gauge. Unix timestamp of last execution

### API Performance Metrics

**Request Metrics:**
- `http_requests_total` — Counter. Total requests by endpoint, method, status code
  - Tags: `method` (GET/POST/etc), `endpoint` (/api/leads, /api/campaigns, etc), `status` (200, 400, 500, etc)
- `http_request_duration_seconds` — Histogram. Response time distribution by endpoint
  - Tags: `method`, `endpoint`
  - Buckets: 0.01, 0.05, 0.1, 0.5, 1, 2 seconds (captures slow endpoints)
- `http_requests_errors_total` — Counter. Errors by status code
  - Tags: `status`, `endpoint`

**Error Metrics:**
- `api_errors_4xx_total` — Counter. Client errors (400, 401, 403, 404, etc)
- `api_errors_5xx_total` — Counter. Server errors (500, 503, etc)

### System Metrics

Collected via standard Prometheus node_exporter:
- `node_cpu_seconds_total` — CPU time
- `node_memory_MemAvailable_bytes` — Available memory
- `node_filesystem_avail_bytes` — Disk space available
- `node_network_receive_bytes_total` — Network I/O

---

## Where Metrics Are Emitted

### Business Metrics (in API handlers)

**Lead Scoring (app/api/leads/[id]/score/route.ts):**
```
When lead is scored:
  - Increment leads_scored_total
  - Update leads_score_distribution with new score
  - Update leads_by_status gauge
```

**Follow-ups (app/api/leads/[id]/follow-up/route.ts):**
```
When follow-up scheduled:
  - Increment follow_ups_scheduled_total
When follow-up sent (app/api/leads/[id]/send-followup/route.ts):
  - Increment follow_ups_completed_total
```

**Campaigns (during meta-sync):**
```
When campaigns synced:
  - Update conversions_by_campaign for each campaign
  - Update campaign_roi_ratio
  - Increment campaign_spend_total
```

### Job Health Metrics (in lib/jobs/schedule-jobs.ts)

Wrap each job execution:
```typescript
// Before job runs
const startTime = Date.now();

try {
  await scoreAllLeads();
  // On success
  metrics.scoringJobSuccesses.inc();
  metrics.scoringJobDuration.observe((Date.now() - startTime) / 1000);
  metrics.scoringJobLastRun.set(Date.now() / 1000);
} catch (error) {
  // On failure
  metrics.scoringJobFailures.inc();
  metrics.scoringJobDuration.observe((Date.now() - startTime) / 1000);
  logger.error('Scoring job failed', { error, duration: Date.now() - startTime });
}
```

### API Performance Metrics (middleware)

Express/Next.js middleware wraps all requests:
```typescript
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    metrics.httpRequestDuration.observe(
      { method: req.method, endpoint: req.path },
      duration
    );
    metrics.httpRequestsTotal.inc(
      { method: req.method, endpoint: req.path, status: res.statusCode }
    );
  });
  next();
});
```

---

## Grafana Dashboards

### Dashboard 1: Business Metrics

**Purpose:** Track what matters — lead quality, follow-up effectiveness, campaign performance

**Panels:**
1. **Leads Scored (Trend)** — Line chart, leads_scored_total over time (last 7 days)
2. **AI Score Distribution** — Histogram, leads_score_distribution (shows if scoring is balanced)
3. **Leads by Status** — Stacked area chart, leads_by_status for each status
4. **Follow-ups Performance** — Line chart showing scheduled vs completed (follow_ups_scheduled_total vs follow_ups_completed_total)
5. **Conversion by Campaign** — Ranked bar chart, conversions_by_campaign (top 10)
6. **Campaign ROI** — Ranked bar chart, campaign_roi_ratio (top 10 by ROI)
7. **Overdue Follow-ups** — Single stat (gauge) showing current count

### Dashboard 2: Job Health

**Purpose:** Know if background jobs are reliable

**Panels:**
1. **Scoring Job Status** — Single stat showing success rate % (successes / total runs, last 24h)
2. **Scoring Job Last Run** — Single stat showing time since last execution
3. **Scoring Job Duration** — Histogram, scoring_job_duration_seconds with p50/p95/p99
4. **Sync Job Status** — Single stat showing success rate %
5. **Sync Job Last Run** — Single stat showing time since last execution
6. **Sync Job Duration** — Histogram, meta_sync_job_duration_seconds
7. **Job Failures (Recent)** — Table/log panel showing recent failures from logs
8. **Job Execution Timeline** — Line chart showing run count over time

### Dashboard 3: API Performance

**Purpose:** Identify slow/failing endpoints

**Panels:**
1. **Request Throughput** — Line chart, http_requests_total broken down by endpoint (requests/sec)
2. **Response Time by Endpoint** — Line chart showing p50, p95, p99 latencies
3. **Error Rate by Endpoint** — Line chart showing error % for each endpoint
4. **Error Types** — Pie chart breaking down errors by status code (404, 500, etc)
5. **Slowest Endpoints** — Table ranked by p99 latency (last hour)
6. **Most Errors** — Table ranked by error count (last hour)

### Dashboard 4: System Health

**Purpose:** Monitor server capacity

**Panels:**
1. **CPU Usage** — Line chart, cpu_seconds_total (% over time)
2. **Memory Usage** — Line chart, memory_available_bytes (MB available over time)
3. **Disk Usage** — Gauge showing % disk full
4. **Uptime** — Single stat showing days since last restart
5. **Network I/O** — Line chart showing bytes in/out

---

## Alert Rules & Thresholds

**Critical Alerts (immediate Slack + Email):**
1. **Scoring job failed** — Trigger on `scoring_job_failures_total > 0` in last hour
2. **Meta sync job failed** — Trigger on `meta_sync_job_failures_total > 0` in last hour
3. **Disk usage >85%** — Trigger on `node_filesystem_avail_bytes` dropping below threshold
4. **API error rate >10%** — Trigger on (http_requests_errors_total / http_requests_total) > 0.1 for 5 minutes

**Warning Alerts (Slack only):**
1. **API error rate >5%** — Trigger on error rate >0.05 for 5 minutes
2. **Response time p95 >2 seconds** — Trigger on http_request_duration_seconds p95 > 2s for 5 minutes
3. **Disk usage >70%** — Trigger on disk dropping below 30% available
4. **Scoring job hasn't run recently** — Trigger if scoring_job_last_run > 90 minutes ago (job should run every 60 minutes)

**Info Alerts (Daily Slack summary):**
1. **Overdue follow-ups summary** — Daily report: "You have N follow-ups past due"
2. **Job performance summary** — Daily report: "Scoring job: 28/28 runs successful, Sync job: 4/4 runs successful"

---

## Logging Strategy

### Log Format

All logs are structured JSON with consistent fields:

```json
{
  "timestamp": "2026-03-28T14:35:22.123Z",
  "level": "info",
  "context": "job-name or endpoint-path",
  "message": "Human-readable summary",
  "duration_ms": 1234,
  "status": "success or error",
  "metadata": { /* Additional context-specific fields */ }
}
```

### Log Destinations

**`/var/log/meta-ads-crm/app.log`** — Application logs (info and above)
- API requests (method, endpoint, duration, status)
- Lead creation/update/deletion
- Campaign sync results
- General info messages

**`/var/log/meta-ads-crm/jobs.log`** — Job-specific logs
- Scoring job: start, progress (every N leads), completion, errors
- Meta sync job: start, campaigns synced, completion, errors

**`/var/log/errors.log`** — Error-only logs (for quick triage)
- Any error level logs from anywhere
- Exceptions with stack traces
- Failed validation, database errors

**Log Rotation:** Daily rotation, 30-day retention (keeps ~1 month of logs, frees disk)

### Example Logs

**Scoring Job Success:**
```json
{
  "timestamp": "2026-03-28T14:00:00Z",
  "level": "info",
  "context": "scoring-job",
  "message": "Scoring job completed successfully",
  "leadCount": 1247,
  "duration_ms": 3245,
  "status": "success"
}
```

**Scoring Job Failure:**
```json
{
  "timestamp": "2026-03-28T15:00:00Z",
  "level": "error",
  "context": "scoring-job",
  "message": "Scoring job failed: database connection timeout",
  "duration_ms": 45000,
  "status": "error",
  "error": "ECONNREFUSED",
  "stack": "Error: connect ECONNREFUSED..."
}
```

**API Request:**
```json
{
  "timestamp": "2026-03-28T14:35:45Z",
  "level": "info",
  "context": "POST /api/leads",
  "message": "Lead created successfully",
  "leadId": "lead_abc123",
  "orgId": "org_xyz789",
  "duration_ms": 450,
  "status": "success"
}
```

**API Error:**
```json
{
  "timestamp": "2026-03-28T14:36:10Z",
  "level": "error",
  "context": "POST /api/leads",
  "message": "Failed to create lead: validation error",
  "error": "Email required",
  "duration_ms": 12,
  "status": "error"
}
```

---

## File Structure

**New Files:**
- `lib/metrics.ts` — Prometheus metrics definitions and initialization
- `lib/logger.ts` — Winston/Pino logger configuration
- `middleware/metrics-middleware.ts` — Express middleware for API metrics
- `docker-compose.yml` — Prometheus + Grafana containers
- `monitoring/prometheus.yml` — Prometheus config (scrape interval, targets)
- `monitoring/grafana-dashboards/*.json` — 4 dashboard JSON definitions
- `monitoring/grafana-alerts/*.yml` — Alert rule definitions

**Modified Files:**
- `lib/jobs/schedule-jobs.ts` — Add metrics and logging to scoring/sync jobs
- `app/api/metrics/route.ts` — New endpoint to expose Prometheus metrics
- `middleware.ts` — Add metrics middleware
- `package.json` — Add dependencies (prom-client, winston, @types/node)

**Configuration:**
- `.env.local` — Add `SLACK_WEBHOOK_URL`, `ALERT_EMAIL`
- `docker-compose.yml` — Create with Prometheus and Grafana services
- Grafana provisioning config for auto-loading dashboards

---

## Implementation Scope

**What gets built:**
- Prometheus metrics for business, jobs, and API performance (~150 lines in lib/metrics.ts)
- Structured JSON logging throughout app (~100 lines in lib/logger.ts)
- API middleware for request metrics (~50 lines)
- Docker Compose setup with Prometheus + Grafana
- 4 Grafana dashboards (auto-provisioned)
- 8 alert rules with Slack + Email routing

**What doesn't change:**
- Database schema (no changes needed)
- API endpoints (only add logging calls)
- Frontend (no UI changes, monitoring is in Grafana)

**Dependencies added:**
- `prom-client` — Prometheus metrics client
- `winston` or `pino` — Structured logging
- Docker (for Prometheus/Grafana)

---

## Success Criteria

✅ **Metrics:** All 30+ defined metrics are being collected and stored in Prometheus

✅ **Dashboards:** 4 dashboards display correctly with live data from your app

✅ **Alerts:** Critical alerts (job failures, errors) trigger to Slack and email within 1 minute

✅ **Logging:** Structured logs written to files with proper rotation

✅ **Performance:** Monitoring adds <5% overhead to app response times

✅ **Visibility:** You can answer these questions in 30 seconds:
  - How many leads scored in the last 24 hours?
  - Did the scoring job run successfully this morning?
  - Which API endpoint is slowest?
  - What's the conversion rate by campaign?

---

## Known TODOs (Phase 2.2+)

- Upgrade to ELK stack when you exceed 100 organizations (for centralized log search)
- Add custom alerting rules based on business logic (e.g., "alert if conversion rate drops >20%")
- Build operational runbooks for common alerts (e.g., "if scoring job fails, do X")
- Add cost monitoring (track AWS/hosting spend)
- Integrate with incident management (PagerDuty) for critical alerts

---

## Deployment Notes

**Prerequisites:**
- Docker + Docker Compose installed on server
- Slack webhook URL (create in Slack workspace)
- Email configuration (SMTP credentials or Mailgun API)

**Installation Steps (high-level):**
1. Add prom-client and winston dependencies
2. Create lib/metrics.ts with metric definitions
3. Create lib/logger.ts with logging configuration
4. Add metrics middleware to request pipeline
5. Wrap jobs in schedule-jobs.ts with metrics
6. Create docker-compose.yml with Prometheus + Grafana
7. Create Grafana dashboards and alert rules
8. Deploy with `docker-compose up -d`
9. Access Grafana at `http://server:3001`

**Monitoring the Monitoring:**
- Prometheus health check: `curl http://localhost:9090/-/healthy`
- Grafana health check: `curl http://localhost:3001/api/health`
- App metrics endpoint: `curl http://localhost:3000/api/metrics`

---

## Architecture Decision Records

**Q: Why Prometheus over other metric systems?**
A: Prometheus is the industry standard for self-hosted monitoring. Lightweight, simple to set up, excellent Grafana integration, no external dependencies. Works great for single-server deployments.

**Q: Why self-hosted instead of SaaS (Datadog, New Relic)?**
A: You chose self-hosted to avoid recurring costs. Prometheus + Grafana fits that constraint perfectly. Easy to upgrade to SaaS later without rework.

**Q: Why file logs instead of ELK?**
A: ELK adds significant complexity (3 services, requires more RAM). At your scale (<10k leads), file logs with rotation are sufficient. Upgrade to ELK when you have 100+ organizations or need distributed logging.

**Q: Why alert from Grafana instead of Prometheus Alertmanager?**
A: Grafana's native alerting is simpler to set up and integrates directly with Slack/email without additional configuration. Alertmanager would add another container and config complexity.

**Q: Why only 4 dashboards instead of more?**
A: YAGNI principle. These 4 cover your 3 priorities (business > jobs > API). Add more dashboards only when you find yourself asking questions they don't answer.
