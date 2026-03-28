import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';
import * as metrics from '@/lib/metrics';
import { MessageQueueService } from '@/lib/messaging/message-queue-service';

interface TwilioWebhookData {
  MessageSid?: string;
  AccountSid?: string;
  From?: string;
  To?: string;
  MessageStatus?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

const messageQueueService = new MessageQueueService();

/**
 * Map Twilio message status to our statuses
 */
function mapTwilioStatusToOurStatus(twilioStatus: string): string {
  const statusMap: Record<string, string> = {
    'queued': 'pending',
    'sending': 'sending',
    'sent': 'sent',
    'failed': 'failed',
    'delivered': 'sent',
    'undelivered': 'failed',
    'read': 'sent',
  };

  return statusMap[twilioStatus] || 'pending';
}

/**
 * Find message by Twilio SID
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
    // Twilio sends form-encoded data
    const contentType = request.headers.get('content-type') || '';

    let data: TwilioWebhookData = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      data = Object.fromEntries(params) as TwilioWebhookData;
    } else if (contentType.includes('application/json')) {
      data = await request.json();
    } else {
      logger.warn('Unknown content type for Twilio webhook', {
        context: 'twilio-webhook',
        contentType,
      });
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }

    const messageSid = data.MessageSid;
    const messageStatus = data.MessageStatus;

    logger.info('Received Twilio webhook', {
      context: 'twilio-webhook',
      messageSid,
      status: messageStatus,
    });

    if (!messageSid || !messageStatus) {
      logger.warn('Twilio webhook missing required fields', {
        context: 'twilio-webhook',
        messageSid,
        messageStatus,
      });
      return NextResponse.json({ success: true });
    }

    // Find our message
    const message = await findMessageByExternalId(messageSid);

    if (!message) {
      logger.warn('Message not found for Twilio webhook', {
        context: 'twilio-webhook',
        externalId: messageSid,
        status: messageStatus,
      });
      return NextResponse.json({ success: true });
    }

    // Map status
    const ourStatus = mapTwilioStatusToOurStatus(messageStatus);
    let failureReason: string | undefined;

    if (
      messageStatus === 'failed' ||
      messageStatus === 'undelivered'
    ) {
      failureReason = data.ErrorMessage || `Twilio: ${messageStatus}`;
      if (data.ErrorCode) {
        failureReason += ` (Code: ${data.ErrorCode})`;
      }
    }

    // Update message status
    await messageQueueService.updateStatus(message.id, ourStatus, {
      externalId: messageSid,
      failureReason,
      deliveryStatus: messageStatus,
    });

    // Log delivery
    await messageQueueService.logDelivery(
      message.id,
      message.orgId,
      ourStatus,
      {
        twilioStatus: messageStatus,
        twilioSid: messageSid,
        errorCode: data.ErrorCode,
        errorMessage: data.ErrorMessage,
      }
    );

    // Record metrics
    if (ourStatus === 'sent') {
      metrics.messagesSentTotal.labels('sms', message.orgId).inc();
    } else if (ourStatus === 'failed') {
      const reason = data.ErrorCode || messageStatus;
      metrics.messagesFailedTotal.labels('sms', reason, message.orgId).inc();
      metrics.providerApiErrorsTotal
        .labels('twilio', data.ErrorCode || 'unknown', message.orgId)
        .inc();
    }

    logger.info('Twilio webhook processed', {
      context: 'twilio-webhook',
      messageId: message.id,
      status: messageStatus,
      ourStatus,
      messageSid,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Twilio webhook handler failed', {
      context: 'twilio-webhook',
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    );
  }
}
