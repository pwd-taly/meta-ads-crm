import { scoreAllLeads } from "./score-leads";
import { syncAllCampaigns } from "./meta-sync";
import logger from '@/lib/logger';
import * as metrics from '@/lib/metrics';
import { MessageQueueService } from '@/lib/messaging/message-queue-service';
import { SendGridClient } from '@/lib/messaging/sendgrid-client';
import { TwilioClient } from '@/lib/messaging/twilio-client';
import { MetaWhatsAppClient } from '@/lib/messaging/meta-whatsapp-client';
import { prisma } from '@/lib/db';
import { triggerWorkflowsForEntity } from '@/lib/workflows/workflow-runner';
import { TriggerContext } from '@/lib/workflows/trigger-evaluator';

let scoreJobInterval: NodeJS.Timeout | null = null;
let metaSyncJobInterval: NodeJS.Timeout | null = null;
let messageQueueJobInterval: NodeJS.Timeout | null = null;
let timeBasedWorkflowInterval: NodeJS.Timeout | null = null;

const messageQueueService = new MessageQueueService();

// Initialize messaging clients
let sendGridClient: SendGridClient | null = null;
let twilioClient: TwilioClient | null = null;
let metaWhatsAppClient: MetaWhatsAppClient | null = null;

function initializeMessagingClients() {
  const sendGridApiKey = process.env.SENDGRID_API_KEY;
  const sendGridFromEmail = process.env.SENDGRID_FROM_EMAIL;
  const sendGridFromName = process.env.SENDGRID_FROM_NAME || 'Meta Ads CRM';

  if (sendGridApiKey) {
    sendGridClient = new SendGridClient({
      apiKey: sendGridApiKey,
      fromEmail: sendGridFromEmail,
      fromName: sendGridFromName,
    });
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (twilioSid && twilioToken && twilioPhone) {
    twilioClient = new TwilioClient({
      apiSid: twilioSid,
      apiKey: twilioToken,
      fromPhone: twilioPhone,
    });
  }

  const whatsappApiKey = process.env.META_WHATSAPP_API_KEY;
  const whatsappBusinessId = process.env.META_WHATSAPP_BUSINESS_ID;
  const whatsappPhoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

  if (whatsappApiKey && whatsappBusinessId && whatsappPhoneId) {
    metaWhatsAppClient = new MetaWhatsAppClient({
      apiKey: whatsappApiKey,
      businessAccountId: whatsappBusinessId,
      phoneNumberId: whatsappPhoneId,
    });
  }
}

/**
 * Helper function to determine if a time-based workflow should run
 * @param frequency - "daily", "weekly", or "monthly"
 * @param time - Time string in "HH:mm" format
 * @param currentHour - Current hour (0-23)
 * @param currentMinute - Current minute (0-59)
 * @param dayOfWeek - Current day of week (0-6, where 0 is Sunday)
 * @param dayOfMonth - Current day of month (1-31)
 * @returns true if workflow should run now (within ±5 minute window)
 */
function shouldRunTimeBasedWorkflow(
  frequency: string,
  time: string,
  currentHour: number,
  currentMinute: number,
  dayOfWeek: number,
  dayOfMonth: number
): boolean {
  // Parse time string "HH:mm"
  const timeParts = time.split(':');
  if (timeParts.length !== 2) {
    return false;
  }

  const targetHour = parseInt(timeParts[0], 10);
  const targetMinute = parseInt(timeParts[1], 10);

  if (isNaN(targetHour) || isNaN(targetMinute)) {
    return false;
  }

  // Check if current time is within ±5 minute window of target time
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const targetTotalMinutes = targetHour * 60 + targetMinute;
  const timeDiff = Math.abs(currentTotalMinutes - targetTotalMinutes);
  const withinTimeWindow = timeDiff <= 5;

  if (!withinTimeWindow) {
    return false;
  }

  // Check if today matches frequency schedule
  switch (frequency.toLowerCase()) {
    case 'daily':
      // Runs every day
      return true;
    case 'weekly':
      // Runs on Monday (day 1)
      return dayOfWeek === 1;
    case 'monthly':
      // Runs on 1st of month
      return dayOfMonth === 1;
    default:
      return false;
  }
}

/**
 * Process all time-based workflows
 * Finds active workflows with TIME_BASED trigger and executes them for all entities
 */
async function processTimeBasedWorkflows(): Promise<void> {
  try {
    logger.info('Time-based workflow processor started', {
      context: 'time-based-workflow-job',
    });

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();

    // Find all active workflows with TIME_BASED trigger
    const workflows = await prisma.workflow.findMany({
      where: {
        isActive: true,
        trigger: {
          path: ['type'],
          equals: 'TIME_BASED',
        },
      },
    });

    logger.info('Found time-based workflows', {
      context: 'time-based-workflow-job',
      count: workflows.length,
    });

    let totalExecuted = 0;
    let totalFailed = 0;

    for (const workflow of workflows) {
      try {
        const trigger = workflow.trigger as any;
        const config = trigger.config || {};
        const { frequency, time } = config;

        if (!frequency || !time) {
          logger.warn('Incomplete time-based workflow config', {
            context: 'time-based-workflow-job',
            workflowId: workflow.id,
          });
          continue;
        }

        // Check if workflow should run now
        const shouldRun = shouldRunTimeBasedWorkflow(
          frequency,
          time,
          currentHour,
          currentMinute,
          dayOfWeek,
          dayOfMonth
        );

        if (!shouldRun) {
          logger.debug('Time-based workflow not scheduled for this time', {
            context: 'time-based-workflow-job',
            workflowId: workflow.id,
            frequency,
            time,
          });
          continue;
        }

        // Query entities in batches
        const entityType = workflow.entityType as 'lead' | 'campaign';
        const batchSize = 100;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          try {
            let entities: any[] = [];

            if (entityType === 'lead') {
              entities = await prisma.lead.findMany({
                where: { orgId: workflow.orgId },
                skip: offset,
                take: batchSize,
                select: {
                  id: true,
                  orgId: true,
                  customValues: true,
                  status: true,
                  name: true,
                  email: true,
                  phone: true,
                  campaignId: true,
                  aiScore: true,
                  createdAt: true,
                  updatedAt: true,
                },
              });
            } else {
              entities = await prisma.campaign.findMany({
                where: { orgId: workflow.orgId },
                skip: offset,
                take: batchSize,
                select: {
                  id: true,
                  orgId: true,
                  customValues: true,
                  status: true,
                  name: true,
                  budget: true,
                  spend: true,
                  createdAt: true,
                  updatedAt: true,
                },
              });
            }

            if (entities.length === 0) {
              hasMore = false;
              break;
            }

            // Trigger workflow for each entity
            for (const entity of entities) {
              try {
                const triggerContext: TriggerContext = {
                  triggerType: 'TIME_BASED',
                  entityType,
                };

                await triggerWorkflowsForEntity(
                  workflow.orgId,
                  entityType,
                  entity.id,
                  entity,
                  'TIME_BASED',
                  triggerContext
                );

                totalExecuted++;
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                logger.error('Failed to trigger workflow for entity', {
                  context: 'time-based-workflow-job',
                  workflowId: workflow.id,
                  entityId: entity.id,
                  error: errorMsg,
                });
                totalFailed++;
              }
            }

            offset += batchSize;
            hasMore = entities.length === batchSize;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('Failed to process entity batch', {
              context: 'time-based-workflow-job',
              workflowId: workflow.id,
              offset,
              error: errorMsg,
            });
            hasMore = false;
          }
        }

        logger.info('Time-based workflow processed', {
          context: 'time-based-workflow-job',
          workflowId: workflow.id,
          frequency,
          time,
          entitiesProcessed: totalExecuted,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Failed to process time-based workflow', {
          context: 'time-based-workflow-job',
          workflowId: workflow.id,
          error: errorMsg,
        });
        totalFailed++;
      }
    }

    logger.info('Time-based workflow processor completed', {
      context: 'time-based-workflow-job',
      totalExecuted,
      totalFailed,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Time-based workflow job failed', {
      context: 'time-based-workflow-job',
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

/**
 * Check if an error is transient (should be retried)
 */
function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  // Network errors
  if (message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) {
    return true;
  }

  // API rate limiting
  if (message.includes('429') || message.includes('Too Many Requests')) {
    return true;
  }

  // Temporary service unavailability
  if (message.includes('503') || message.includes('Service Unavailable')) {
    return true;
  }

  // Bad gateway
  if (message.includes('502') || message.includes('Bad Gateway')) {
    return true;
  }

  return false;
}

/**
 * Process pending messages from the queue
 */
async function processMessageQueue() {
  try {
    logger.info('Message queue processing started', {
      context: 'message-queue-job',
    });

    // Get all organizations with pending messages
    const orgsWithPending = await prisma.messageQueue.findMany({
      where: { status: 'pending' },
      select: { orgId: true },
      distinct: ['orgId'],
    });

    if (orgsWithPending.length === 0) {
      logger.debug('No organizations with pending messages', {
        context: 'message-queue-job',
      });
      return;
    }

    let totalProcessed = 0;
    let totalFailed = 0;

    for (const org of orgsWithPending) {
      try {
        const batchSize = parseInt(
          process.env.MESSAGE_SEND_BATCH_SIZE || '100',
          10
        );

        const messages = await messageQueueService.getPendingMessages(
          org.orgId,
          batchSize
        );

        for (const message of messages) {
          try {
            await processMessage(message, org.orgId);
            totalProcessed++;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('Failed to process message', {
              context: 'message-queue-job',
              messageId: message.id,
              error: errorMsg,
            });
            totalFailed++;

            // Handle retry logic
            if (isTransientError(error)) {
              const retryResult = await messageQueueService.retryMessage(message.id);
              if (retryResult.success) {
                logger.info('Message scheduled for retry', {
                  context: 'message-queue-job',
                  messageId: message.id,
                  nextRetryTime: retryResult.nextRetryTime,
                });
              } else {
                logger.warn('Cannot retry message', {
                  context: 'message-queue-job',
                  messageId: message.id,
                  reason: retryResult.reason,
                });
              }
            } else {
              // Permanent error - mark as failed
              await messageQueueService.markAsFailed(
                message.id,
                errorMsg
              );
            }
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Failed to process org batch', {
          context: 'message-queue-job',
          orgId: org.orgId,
          error: errorMsg,
        });
      }
    }

    logger.info('Message queue processing completed', {
      context: 'message-queue-job',
      totalProcessed,
      totalFailed,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Message queue job failed', {
      context: 'message-queue-job',
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

/**
 * Process a single message
 */
async function processMessage(message: any, orgId: string) {
  const startTime = Date.now();

  try {
    // Check if scheduled time has passed
    if (message.scheduledFor && message.scheduledFor > new Date()) {
      logger.debug('Message not yet scheduled', {
        context: 'message-queue-job',
        messageId: message.id,
        scheduledFor: message.scheduledFor,
      });
      return;
    }

    // Update status to sending
    await messageQueueService.updateStatus(message.id, 'sending');

    let result;

    // Route to appropriate provider
    switch (message.channel) {
      case 'email':
        if (!sendGridClient) {
          throw new Error('SendGrid client not configured');
        }
        result = await sendGridClient.send({
          to: message.recipientEmail,
          subject: message.subject || 'Message',
          body: message.body,
        });
        break;

      case 'sms':
        if (!twilioClient) {
          throw new Error('Twilio client not configured');
        }
        result = await twilioClient.send({
          to: message.recipientPhone,
          body: message.body,
        });
        break;

      case 'whatsapp':
        if (!metaWhatsAppClient) {
          throw new Error('Meta WhatsApp client not configured');
        }
        result = await metaWhatsAppClient.send({
          to: message.recipientPhone,
          body: message.body,
        });
        break;

      default:
        throw new Error(`Unknown channel: ${message.channel}`);
    }

    if (result.success) {
      // Mark as sent
      await messageQueueService.updateStatus(message.id, 'sent', {
        externalId: result.externalId,
      });

      // Log delivery
      await messageQueueService.logDelivery(
        message.id,
        orgId,
        'sent',
        { externalId: result.externalId }
      );

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      metrics.messagesSentTotal.labels(message.channel, orgId).inc();
      metrics.messageSendDurationSeconds
        .labels(message.channel, orgId)
        .observe(duration);

      logger.info('Message sent successfully', {
        context: 'message-queue-job',
        messageId: message.id,
        channel: message.channel,
        externalId: result.externalId,
        durationMs: Date.now() - startTime,
      });
    } else {
      throw new Error(result.error || 'Unknown send error');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const duration = (Date.now() - startTime) / 1000;

    // Record failure metrics
    let errorType = 'unknown_error';
    if (errorMsg.includes('Invalid')) {
      errorType = 'validation_error';
    } else if (errorMsg.includes('not configured')) {
      errorType = 'configuration_error';
    } else if (errorMsg.includes('API error')) {
      errorType = 'api_error';
    }

    metrics.messagesFailedTotal
      .labels(message.channel, errorType, orgId)
      .inc();
    metrics.messageSendDurationSeconds
      .labels(message.channel, orgId)
      .observe(duration);

    // Record provider-specific errors
    const provider = message.channel === 'email' ? 'sendgrid' :
                     message.channel === 'sms' ? 'twilio' :
                     message.channel === 'whatsapp' ? 'meta_whatsapp' :
                     'unknown';

    metrics.providerApiErrorsTotal
      .labels(provider, errorType, orgId)
      .inc();

    throw error;
  }
}

export function initializeJobScheduler() {
  if (scoreJobInterval) {
    logger.info('Job scheduler already initialized', { context: 'job-scheduler' });
    return;
  }

  logger.info('Initializing job scheduler', { context: 'job-scheduler' });

  // Initialize messaging clients
  initializeMessagingClients();

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

  // Run message queue processor every 5 minutes
  messageQueueJobInterval = setInterval(async () => {
    await processMessageQueue();
  }, 5 * 60 * 1000); // 5 minutes

  // Also run once on startup
  processMessageQueue().catch((error) =>
    logger.error('Initial message queue processing failed', {
      context: 'message-queue-job',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
  );

  // Run time-based workflow processor every 5 minutes
  logger.info('Time-based workflow processor registered', {
    context: 'job-scheduler',
  });

  timeBasedWorkflowInterval = setInterval(async () => {
    await processTimeBasedWorkflows();
  }, 5 * 60 * 1000); // 5 minutes

  // Also run once on startup
  processTimeBasedWorkflows().catch((error) =>
    logger.error('Initial time-based workflow processing failed', {
      context: 'time-based-workflow-job',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
  );
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
  if (messageQueueJobInterval) {
    clearInterval(messageQueueJobInterval);
    messageQueueJobInterval = null;
  }
  if (timeBasedWorkflowInterval) {
    clearInterval(timeBasedWorkflowInterval);
    timeBasedWorkflowInterval = null;
  }
  logger.info('Job scheduler stopped', { context: 'job-scheduler' });
}
