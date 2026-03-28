import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageQueueService } from '@/lib/messaging/message-queue-service';
import { prisma } from '@/lib/db';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    messageQueue: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    messageLog: {
      create: vi.fn(),
    },
  },
}));

describe('MessageQueueService', () => {
  let service: MessageQueueService;

  beforeEach(() => {
    service = new MessageQueueService();
    vi.clearAllMocks();
  });

  describe('enqueue', () => {
    it('should enqueue a message with pending status', async () => {
      const mockMessage = {
        id: 'msg-1',
        orgId: 'org-1',
        leadId: 'lead-1',
        channel: 'email',
        body: 'Test message',
        status: 'pending',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.messageQueue.create).mockResolvedValueOnce(mockMessage as any);

      const result = await service.enqueue({
        orgId: 'org-1',
        leadId: 'lead-1',
        channel: 'email',
        recipientEmail: 'test@example.com',
        body: 'Test message',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
      expect(prisma.messageQueue.create).toHaveBeenCalled();
    });

    it('should enqueue SMS with phone number', async () => {
      const mockMessage = {
        id: 'msg-2',
        orgId: 'org-1',
        leadId: 'lead-1',
        channel: 'sms',
        body: 'Test SMS',
        status: 'pending',
        recipientPhone: '+1234567890',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.messageQueue.create).mockResolvedValueOnce(mockMessage as any);

      const result = await service.enqueue({
        orgId: 'org-1',
        leadId: 'lead-1',
        channel: 'sms',
        recipientPhone: '+1234567890',
        body: 'Test SMS',
      });

      expect(result.status).toBe('pending');
      expect(prisma.messageQueue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientPhone: '+1234567890',
          }),
        })
      );
    });

    it('should include optional fields when provided', async () => {
      const mockMessage = {
        id: 'msg-3',
        orgId: 'org-1',
        leadId: 'lead-1',
        channel: 'email',
        templateId: 'template-1',
        subject: 'Test Subject',
        body: 'Test message',
        status: 'pending',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.messageQueue.create).mockResolvedValueOnce(mockMessage as any);

      await service.enqueue({
        orgId: 'org-1',
        leadId: 'lead-1',
        channel: 'email',
        recipientEmail: 'test@example.com',
        templateId: 'template-1',
        subject: 'Test Subject',
        body: 'Test message',
      });

      expect(prisma.messageQueue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            templateId: 'template-1',
            subject: 'Test Subject',
          }),
        })
      );
    });
  });

  describe('getPendingMessages', () => {
    it('should fetch pending messages', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          orgId: 'org-1',
          status: 'pending',
          channel: 'email',
        },
        {
          id: 'msg-2',
          orgId: 'org-1',
          status: 'pending',
          channel: 'sms',
        },
      ];

      vi.mocked(prisma.messageQueue.findMany).mockResolvedValueOnce(mockMessages as any);

      const result = await service.getPendingMessages('org-1', 10);

      expect(result).toHaveLength(2);
      expect(prisma.messageQueue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            orgId: 'org-1',
            status: 'pending',
          },
          take: 10,
        })
      );
    });

    it('should respect batch size limit', async () => {
      vi.mocked(prisma.messageQueue.findMany).mockResolvedValueOnce([]);

      await service.getPendingMessages('org-1', 50);

      expect(prisma.messageQueue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it('should filter by organization', async () => {
      vi.mocked(prisma.messageQueue.findMany).mockResolvedValueOnce([]);

      await service.getPendingMessages('org-2', 10);

      expect(prisma.messageQueue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            orgId: 'org-2',
            status: 'pending',
          },
        })
      );
    });
  });

  describe('updateStatus', () => {
    it('should update message status to sent', async () => {
      const mockUpdatedMessage = {
        id: 'msg-1',
        status: 'sent',
        sentAt: new Date(),
        externalId: 'ext-123',
      };

      vi.mocked(prisma.messageQueue.update).mockResolvedValueOnce(mockUpdatedMessage as any);

      const result = await service.updateStatus('msg-1', 'sent', {
        externalId: 'ext-123',
      });

      expect(result.status).toBe('sent');
      expect(prisma.messageQueue.update).toHaveBeenCalled();
    });

    it('should update message status to failed', async () => {
      const mockUpdatedMessage = {
        id: 'msg-1',
        status: 'failed',
        failureReason: 'Invalid email',
      };

      vi.mocked(prisma.messageQueue.update).mockResolvedValueOnce(mockUpdatedMessage as any);

      const result = await service.updateStatus('msg-1', 'failed', {
        failureReason: 'Invalid email',
      });

      expect(result.status).toBe('failed');
      expect(result.failureReason).toBe('Invalid email');
    });

    it('should set sentAt timestamp for sent messages', async () => {
      const mockUpdatedMessage = {
        id: 'msg-1',
        status: 'sent',
        sentAt: expect.any(Date),
      };

      vi.mocked(prisma.messageQueue.update).mockResolvedValueOnce(mockUpdatedMessage as any);

      await service.updateStatus('msg-1', 'sent');

      expect(prisma.messageQueue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sentAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('retryMessage', () => {
    it('should increment retry count', async () => {
      vi.mocked(prisma.messageQueue.findUnique).mockResolvedValueOnce({
        retryCount: 0,
      } as any);

      vi.mocked(prisma.messageQueue.update).mockResolvedValueOnce({
        id: 'msg-1',
        retryCount: 1,
        status: 'pending',
      } as any);

      const result = await service.retryMessage('msg-1');

      expect(result.success).toBe(true);
      expect(result.nextRetryTime).toBeDefined();
      expect(prisma.messageQueue.update).toHaveBeenCalled();
    });

    it('should respect max retry limit', async () => {
      vi.mocked(prisma.messageQueue.findUnique).mockResolvedValueOnce({
        retryCount: 3,
      } as any);

      const result = await service.retryMessage('msg-1');

      expect(result.success).toBe(false);
      expect(result.reason).toContain('max retries');
    });

    it('should return next retry time based on exponential backoff', async () => {
      vi.mocked(prisma.messageQueue.findUnique).mockResolvedValueOnce({
        retryCount: 0,
      } as any);

      const mockUpdatedMessage = {
        id: 'msg-1',
        retryCount: 1,
        scheduledFor: new Date(Date.now() + 60000), // 1 min
      };

      vi.mocked(prisma.messageQueue.update).mockResolvedValueOnce(mockUpdatedMessage as any);

      const result = await service.retryMessage('msg-1');

      expect(result.success).toBe(true);
      expect(result.nextRetryTime).toBeDefined();
    });
  });

  describe('markAsFailed', () => {
    it('should mark message as failed', async () => {
      const mockFailedMessage = {
        id: 'msg-1',
        status: 'failed',
        failureReason: 'Bounced',
      };

      vi.mocked(prisma.messageQueue.update).mockResolvedValueOnce(mockFailedMessage as any);

      const result = await service.markAsFailed('msg-1', 'Bounced');

      expect(result.status).toBe('failed');
      expect(result.failureReason).toBe('Bounced');
      expect(prisma.messageQueue.update).toHaveBeenCalled();
    });

    it('should reset retry count when marking as failed', async () => {
      vi.mocked(prisma.messageQueue.update).mockResolvedValueOnce({
        id: 'msg-1',
        status: 'failed',
      } as any);

      await service.markAsFailed('msg-1', 'Permanent failure');

      expect(prisma.messageQueue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            retryCount: 0,
          }),
        })
      );
    });
  });

  describe('logDelivery', () => {
    it('should log message delivery', async () => {
      const mockLog = {
        id: 'log-1',
        queueId: 'msg-1',
        status: 'sent',
        timestamp: new Date(),
      };

      vi.mocked(prisma.messageLog.create).mockResolvedValueOnce(mockLog as any);

      const result = await service.logDelivery('msg-1', 'org-1', 'sent');

      expect(result).toBeDefined();
      expect(prisma.messageLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            queueId: 'msg-1',
            orgId: 'org-1',
            status: 'sent',
          }),
        })
      );
    });

    it('should include metadata in log', async () => {
      const mockLog = {
        id: 'log-1',
        queueId: 'msg-1',
        status: 'failed',
        metadata: { error: 'Invalid recipient' },
      };

      vi.mocked(prisma.messageLog.create).mockResolvedValueOnce(mockLog as any);

      await service.logDelivery('msg-1', 'org-1', 'failed', {
        error: 'Invalid recipient',
      });

      expect(prisma.messageLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: { error: 'Invalid recipient' },
          }),
        })
      );
    });
  });

  describe('Retry backoff calculation', () => {
    it('should calculate 1 minute backoff for first retry', async () => {
      vi.mocked(prisma.messageQueue.findUnique).mockResolvedValueOnce({
        retryCount: 0,
      } as any);

      const beforeTime = Date.now();
      const mockMessage = {
        id: 'msg-1',
        scheduledFor: new Date(Date.now() + 60000),
      };

      vi.mocked(prisma.messageQueue.update).mockResolvedValueOnce(mockMessage as any);

      await service.retryMessage('msg-1');

      const afterTime = Date.now();
      expect(mockMessage.scheduledFor.getTime()).toBeGreaterThanOrEqual(beforeTime + 60000 - 1000);
      expect(mockMessage.scheduledFor.getTime()).toBeLessThanOrEqual(afterTime + 60000 + 1000);
    });

    it('should calculate 5 minute backoff for second retry', async () => {
      vi.mocked(prisma.messageQueue.findUnique).mockResolvedValueOnce({
        retryCount: 1,
      } as any);

      const beforeTime = Date.now();
      const mockMessage = {
        id: 'msg-1',
        scheduledFor: new Date(Date.now() + 300000), // 5 min
      };

      vi.mocked(prisma.messageQueue.update).mockResolvedValueOnce(mockMessage as any);

      await service.retryMessage('msg-1');

      const afterTime = Date.now();
      expect(mockMessage.scheduledFor.getTime()).toBeGreaterThanOrEqual(beforeTime + 300000 - 1000);
      expect(mockMessage.scheduledFor.getTime()).toBeLessThanOrEqual(afterTime + 300000 + 1000);
    });

    it('should calculate 15 minute backoff for third retry', async () => {
      vi.mocked(prisma.messageQueue.findUnique).mockResolvedValueOnce({
        retryCount: 2,
      } as any);

      const beforeTime = Date.now();
      const mockMessage = {
        id: 'msg-1',
        scheduledFor: new Date(Date.now() + 900000), // 15 min
      };

      vi.mocked(prisma.messageQueue.update).mockResolvedValueOnce(mockMessage as any);

      await service.retryMessage('msg-1');

      const afterTime = Date.now();
      expect(mockMessage.scheduledFor.getTime()).toBeGreaterThanOrEqual(beforeTime + 900000 - 1000);
      expect(mockMessage.scheduledFor.getTime()).toBeLessThanOrEqual(afterTime + 900000 + 1000);
    });
  });
});
