import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';
import * as metrics from '@/lib/metrics';
import { MessageQueueService } from '@/lib/messaging/message-queue-service';

interface SendGridEvent {
  event: string;
  email: string;
  timestamp: number;
  'smtp-id'?: string;
  'message-id'?: string;
  category?: string | string[];
  sg_event_id?: string;
  sg_message_id?: string;
  reason?: string;
  status?: string;
  response?: string;
  attempt?: number;
  type?: string;
  bounce_classification?: string;
}

const messageQueueService = new MessageQueueService();

/**
 * Map SendGrid events to our message statuses
 */
function mapSendGridEventToStatus(event: string): string {
  const eventMap: Record<string, string> = {
    'processed': 'sending',
    'dropped': 'failed',
    'delivered': 'sent',
    'deferred': 'pending',
    'bounce': 'bounced',
    'click': 'sent',
    'open': 'sent',
    'unsubscribe': 'sent',
    'spamreport': 'bounced',
  };
  return eventMap[event] || 'pending';
}

/**
 * Map SendGrid bounce classifications to delivery status
 */
function mapBounceClassification(classification?: string): string {
  if (!classification) return 'bounced';

  const classMap: Record<string, string> = {
    'bounce': 'bounced',
    'complaint': 'complained',
    'dropped': 'dropped',
    'transient': 'bounced',
    'permanent': 'bounced',
  };

  return classMap[classification] || 'bounced';
}

/**
 * Find message by SendGrid message ID
 */
async function findMessageByExternalId(externalId: string) {
  return prisma.messageQueue.findFirst({
    where: { externalId },
    select: {
      id: true,
      orgId: true,
      channel: true,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // SendGrid can send multiple events in a single request
    const events: SendGridEvent[] = Array.isArray(body) ? body : [body];

    logger.info('Received SendGrid webhook', {
      context: 'sendgrid-webhook',
      eventCount: events.length,
    });

    let processedCount = 0;
    let errorCount = 0;

    for (const event of events) {
      try {
        // Extract message ID from SendGrid event
        const externalId = event['sg_message_id'] || event['message-id'];

        if (!externalId) {
          logger.warn('SendGrid event missing message ID', {
            context: 'sendgrid-webhook',
            event: event.event,
            email: event.email,
          });
          continue;
        }

        // Find our message
        const message = await findMessageByExternalId(externalId);

        if (!message) {
          logger.warn('Message not found for SendGrid event', {
            context: 'sendgrid-webhook',
            externalId,
            event: event.event,
          });
          continue;
        }

        // Map status
        const status = mapSendGridEventToStatus(event.event);
        let deliveryStatus: string | undefined;

        if (event.event === 'bounce') {
          deliveryStatus = mapBounceClassification(event.bounce_classification);
        } else if (event.event === 'spamreport') {
          deliveryStatus = 'complained';
        }

        // Update message status
        let failureReason: string | undefined;
        if (event.event === 'dropped' || event.event === 'bounce') {
          failureReason = event.reason || 'SendGrid event: ' + event.event;
        }

        await messageQueueService.updateStatus(message.id, status, {
          externalId,
          failureReason,
          deliveryStatus,
        });

        // Log delivery
        await messageQueueService.logDelivery(
          message.id,
          message.orgId,
          status,
          {
            sendgridEvent: event.event,
            sendgridEventId: event.sg_event_id,
            timestamp: event.timestamp,
            reason: event.reason,
            bounceClassification: event.bounce_classification,
          }
        );

        // Record metrics
        if (status === 'sent') {
          metrics.messagesSentTotal.labels('email', message.orgId).inc();
        } else if (status === 'failed' || status === 'bounced') {
          const reason = failureReason || event.event;
          metrics.messagesFailedTotal
            .labels('email', reason, message.orgId)
            .inc();
        }

        logger.info('SendGrid event processed', {
          context: 'sendgrid-webhook',
          messageId: message.id,
          event: event.event,
          status,
          externalId,
        });

        processedCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Failed to process SendGrid event', {
          context: 'sendgrid-webhook',
          event: event.event,
          error: errorMsg,
        });
        errorCount++;
      }
    }

    logger.info('SendGrid webhook processing completed', {
      context: 'sendgrid-webhook',
      processedCount,
      errorCount,
    });

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ success: true, processed: processedCount });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('SendGrid webhook handler failed', {
      context: 'sendgrid-webhook',
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return 400 to indicate processing error
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    );
  }
}
