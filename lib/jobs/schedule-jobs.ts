import { scoreAllLeads } from "./score-leads";
import { syncAllCampaigns } from "./meta-sync";
import logger from '@/lib/logger';
import * as metrics from '@/lib/metrics';

let scoreJobInterval: NodeJS.Timeout | null = null;
let metaSyncJobInterval: NodeJS.Timeout | null = null;

export function initializeJobScheduler() {
  if (scoreJobInterval) {
    logger.info('Job scheduler already initialized', { context: 'job-scheduler' });
    return;
  }

  logger.info('Initializing job scheduler', { context: 'job-scheduler' });

  // Run scoring job every hour
  scoreJobInterval = setInterval(async () => {
    const startTime = Date.now();
    logger.info('Scoring job started', {
      context: 'scoring-job',
      message: 'Starting lead scoring job',
    });

    try {
      await scoreAllLeads();

      const duration = Date.now() - startTime;
      metrics.scoringJobSuccessesTotal.inc();
      metrics.scoringJobRunsTotal.inc();
      metrics.scoringJobDurationSeconds.observe(duration / 1000);
      metrics.scoringJobLastRunTimestamp.set(Date.now() / 1000);

      logger.info('Scoring job completed', {
        context: 'scoring-job',
        message: 'Scoring job completed successfully',
        duration_ms: duration,
        status: 'success',
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.scoringJobFailuresTotal.inc();
      metrics.scoringJobRunsTotal.inc();
      metrics.scoringJobDurationSeconds.observe(duration / 1000);

      logger.error('Scoring job failed', {
        context: 'scoring-job',
        message: 'Scoring job failed',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration_ms: duration,
        status: 'error',
      });
    }
  }, 60 * 60 * 1000); // 1 hour

  // Also run on startup
  scoreAllLeads().catch((error) =>
    logger.error('Initial scoring job failed', {
      context: 'scoring-job',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
  );

  // Run campaign sync every 6 hours
  metaSyncJobInterval = setInterval(async () => {
    const startTime = Date.now();
    logger.info('Meta sync job started', {
      context: 'meta-sync-job',
      message: 'Starting meta campaign sync',
    });

    try {
      await syncAllCampaigns();

      const duration = Date.now() - startTime;
      metrics.metaSyncJobSuccessesTotal.inc();
      metrics.metaSyncJobRunsTotal.inc();
      metrics.metaSyncJobDurationSeconds.observe(duration / 1000);
      metrics.metaSyncJobLastRunTimestamp.set(Date.now() / 1000);

      logger.info('Meta sync job completed', {
        context: 'meta-sync-job',
        message: 'Campaign sync completed successfully',
        duration_ms: duration,
        status: 'success',
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.metaSyncJobFailuresTotal.inc();
      metrics.metaSyncJobRunsTotal.inc();
      metrics.metaSyncJobDurationSeconds.observe(duration / 1000);

      logger.error('Meta sync job failed', {
        context: 'meta-sync-job',
        message: 'Campaign sync failed',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration_ms: duration,
        status: 'error',
      });
    }
  }, 6 * 60 * 60 * 1000); // 6 hours
}

export function stopJobScheduler() {
  if (scoreJobInterval) {
    clearInterval(scoreJobInterval);
    scoreJobInterval = null;
  }
  if (metaSyncJobInterval) {
    clearInterval(metaSyncJobInterval);
    metaSyncJobInterval = null;
  }
  logger.info('Job scheduler stopped', { context: 'job-scheduler' });
}
