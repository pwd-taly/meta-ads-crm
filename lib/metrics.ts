import { register, Counter, Histogram, Gauge } from 'prom-client';

// Business Metrics - Lead Scoring
export const leadsScoredTotal = new Counter({
  name: 'leads_scored_total',
  help: 'Total leads that have been scored',
});

export const leadsScoreDistribution = new Histogram({
  name: 'leads_score_distribution',
  help: 'Distribution of AI scores (0-100)',
  buckets: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
});

export const leadsByStatus = new Gauge({
  name: 'leads_by_status',
  help: 'Current count of leads in each status',
  labelNames: ['status'],
});

// Business Metrics - Follow-ups
export const followUpsScheduledTotal = new Counter({
  name: 'follow_ups_scheduled_total',
  help: 'Cumulative follow-ups scheduled across all types',
});

export const followUpsCompletedTotal = new Counter({
  name: 'follow_ups_completed_total',
  help: 'Cumulative follow-ups marked as sent',
});

export const followUpsOverdueCount = new Gauge({
  name: 'follow_ups_overdue_count',
  help: 'Current count of follow-ups past due date',
});

// Business Metrics - Campaign Performance
export const conversionsByCampaign = new Gauge({
  name: 'conversions_by_campaign',
  help: 'Current conversion count per campaign',
  labelNames: ['campaign_id', 'campaign_name'],
});

export const campaignRoiRatio = new Gauge({
  name: 'campaign_roi_ratio',
  help: 'ROI per campaign (conversions / spend)',
  labelNames: ['campaign_id'],
});

export const campaignSpendTotal = new Counter({
  name: 'campaign_spend_total',
  help: 'Total spend by campaign (accumulates with sync)',
  labelNames: ['campaign_id'],
});

// Job Health Metrics - Scoring Job
export const scoringJobRunsTotal = new Counter({
  name: 'scoring_job_runs_total',
  help: 'Total scoring job executions (success + failure)',
});

export const scoringJobSuccessesTotal = new Counter({
  name: 'scoring_job_successes_total',
  help: 'Successful scoring job executions',
});

export const scoringJobFailuresTotal = new Counter({
  name: 'scoring_job_failures_total',
  help: 'Failed scoring job executions',
});

export const scoringJobDurationSeconds = new Histogram({
  name: 'scoring_job_duration_seconds',
  help: 'Scoring job execution time distribution',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const scoringJobLastRunTimestamp = new Gauge({
  name: 'scoring_job_last_run_timestamp',
  help: 'Unix timestamp of last scoring job execution',
});

// Job Health Metrics - Meta Sync Job
export const metaSyncJobRunsTotal = new Counter({
  name: 'meta_sync_job_runs_total',
  help: 'Total meta sync job executions',
});

export const metaSyncJobSuccessesTotal = new Counter({
  name: 'meta_sync_job_successes_total',
  help: 'Successful meta sync job executions',
});

export const metaSyncJobFailuresTotal = new Counter({
  name: 'meta_sync_job_failures_total',
  help: 'Failed meta sync job executions',
});

export const metaSyncJobDurationSeconds = new Histogram({
  name: 'meta_sync_job_duration_seconds',
  help: 'Meta sync job execution time distribution',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const metaSyncJobLastRunTimestamp = new Gauge({
  name: 'meta_sync_job_last_run_timestamp',
  help: 'Unix timestamp of last meta sync job execution',
});

// API Performance Metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests by endpoint, method, status',
  labelNames: ['method', 'endpoint', 'status'],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration distribution by endpoint',
  labelNames: ['method', 'endpoint'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
});

export const httpRequestsErrorsTotal = new Counter({
  name: 'http_requests_errors_total',
  help: 'HTTP errors by status code and endpoint',
  labelNames: ['status', 'endpoint'],
});

export const apiErrors4xxTotal = new Counter({
  name: 'api_errors_4xx_total',
  help: 'Total 4xx client errors',
});

export const apiErrors5xxTotal = new Counter({
  name: 'api_errors_5xx_total',
  help: 'Total 5xx server errors',
});

// Business Metrics - Messaging
export const messagesSentTotal = new Counter({
  name: 'messages_sent_total',
  help: 'Total messages sent successfully',
  labelNames: ['channel', 'org_id'],
});

export const messagesFailedTotal = new Counter({
  name: 'messages_failed_total',
  help: 'Total messages that failed to send',
  labelNames: ['channel', 'reason', 'org_id'],
});

export const messagesDeliveryRate = new Gauge({
  name: 'messages_delivery_rate',
  help: 'Delivery rate percentage per channel',
  labelNames: ['channel', 'org_id'],
});

export const messagesQueueDepth = new Gauge({
  name: 'messages_queue_depth',
  help: 'Number of pending messages in queue',
  labelNames: ['channel', 'org_id'],
});

export const messageSendDurationSeconds = new Histogram({
  name: 'message_send_duration_seconds',
  help: 'Time taken to send a message',
  labelNames: ['channel', 'org_id'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const providerApiErrorsTotal = new Counter({
  name: 'provider_api_errors_total',
  help: 'Total API errors from messaging providers',
  labelNames: ['provider', 'error_type', 'org_id'],
});

// Export register for Prometheus
export { register };
