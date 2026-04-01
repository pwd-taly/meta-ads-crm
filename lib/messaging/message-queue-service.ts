import { prisma } from '@/lib/db';
import logger from '@/lib/logger';
import { Prisma } from '@prisma/client';

interface EnqueueOptions {
  orgId: string;
  leadId: string;
  channel: string;
  recipientEmail?: string;
  recipientPhone?: string;
  templateId?: string;
  subject?: string;
  body: string;
  scheduledFor?: Date;
}

interface UpdateStatusOptions {
  externalId?: string;
  failureReason?: string;
  deliveryStatus?: string;
}

interface RetryResult {
  success: boolean;
  reason?: string;
  nextRetryTime?: Date;
}

export class MessageQueueService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS_MS = [60000, 300000, 900000]; // 1 min, 5 min, 15 min

  /**
   * Enqueue a message for sending
   */
  async enqueue(options: EnqueueOptions) {
    try {
      const message = await prisma.messageQueue.create({
        data: {
          orgId: options.orgId,
          leadId: options.leadId,
          channel: options.channel,
          recipientEmail: options.recipientEmail,
          recipientPhone: options.recipientPhone,
          templateId: options.templateId,
          subject: options.subject,
          body: options.body,
          status: 'pending',
          scheduledFor: options.scheduledFor,
          retryCount: 0,
        },
      });

      logger.info('Message enqueued', {
        messageId: message.id,
        orgId: options.orgId,
        channel: options.channel,
        leadId: options.leadId,
      });

      return message;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to enqueue message', {
        orgId: options.orgId,
        error: errorMsg,
      });
      throw error;
    }
  }

  /**
   * Get pending messages for an organization
   */
  async getPendingMessages(orgId: string, batchSize: number = 50) {
    try {
      const messages = await prisma.messageQueue.findMany({
        where: {
          orgId,
          status: 'pending',
        },
        take: batchSize,
        orderBy: {
          createdAt: 'asc',
        },
      });

      logger.info('Fetched pending messages', {
        orgId,
        count: messages.length,
      });

      return messages;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to fetch pending messages', {
        orgId,
        error: errorMsg,
      });
      throw error;
    }
  }

  /**
   * Update message status
   */
  async updateStatus(
    messageId: string,
    status: string,
    options: UpdateStatusOptions = {}
  ) {
    try {
      const data: any = {
        status,
      };

      if (status === 'sent') {
        data.sentAt = new Date();
      }

      if (options.externalId) {
        data.externalId = options.externalId;
      }

      if (options.failureReason) {
        data.failureReason = options.failureReason;
      }

      if (options.deliveryStatus) {
        data.deliveryStatus = options.deliveryStatus;
      }

      const message = await prisma.messageQueue.update({
        where: { id: messageId },
        data,
      });

      logger.info('Message status updated', {
        messageId,
        status,
        externalId: options.externalId,
      });

      return message;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to update message status', {
        messageId,
        status,
        error: errorMsg,
      });
      throw error;
    }
  }

  /**
   * Retry a message with exponential backoff
   * Backoff: 1 min, 5 min, 15 min for retries 1, 2, 3
   */
  async retryMessage(messageId: string): Promise<RetryResult> {
    try {
      const message = await prisma.messageQueue.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        return {
          success: false,
          reason: 'Message not found',
        };
      }

      if (message.retryCount >= this.MAX_RETRIES) {
        return {
          success: false,
          reason: `Reached max retries (${this.MAX_RETRIES})`,
        };
      }

      const nextRetryIndex = message.retryCount;
      const delayMs = this.RETRY_DELAYS_MS[nextRetryIndex];
      const nextRetryTime = new Date(Date.now() + delayMs);

      await prisma.messageQueue.update({
        where: { id: messageId },
        data: {
          retryCount: message.retryCount + 1,
          status: 'pending',
          scheduledFor: nextRetryTime,
        },
      });

      logger.info('Message scheduled for retry', {
        messageId,
        retryCount: message.retryCount + 1,
        nextRetryTime,
        delayMinutes: delayMs / 60000,
      });

      return {
        success: true,
        nextRetryTime,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to retry message', {
        messageId,
        error: errorMsg,
      });
      throw error;
    }
  }

  /**
   * Mark message as permanently failed
   */
  async markAsFailed(messageId: string, reason: string) {
    try {
      const message = await prisma.messageQueue.update({
        where: { id: messageId },
        data: {
          status: 'failed',
          failureReason: reason,
          retryCount: 0,
        },
      });

      logger.info('Message marked as failed', {
        messageId,
        reason,
      });

      return message;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to mark message as failed', {
        messageId,
        error: errorMsg,
      });
      throw error;
    }
  }

  /**
   * Log delivery status
   */
  async logDelivery(
    messageId: string,
    orgId: string,
    status: string,
    metadata?: Record<string, unknown>
  ) {
    try {
      const log = await prisma.messageLog.create({
        data: {
          queueId: messageId,
          orgId,
          status,
          metadata: metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
          sentAt: new Date(),
        },
      });

      logger.info('Delivery logged', {
        logId: log.id,
        messageId,
        status,
      });

      return log;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to log delivery', {
        messageId,
        error: errorMsg,
      });
      throw error;
    }
  }
}
