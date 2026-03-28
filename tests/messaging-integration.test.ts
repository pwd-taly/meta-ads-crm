import { prisma } from '@/lib/db';
import { MessageQueueService } from '@/lib/messaging/message-queue-service';
import { TemplateResolver } from '@/lib/messaging/template-resolver';

const messageQueueService = new MessageQueueService();
const templateResolver = new TemplateResolver();

/**
 * Test data factory functions
 */
async function createTestOrganization() {
  return prisma.organization.create({
    data: {
      name: `Test Org ${Date.now()}`,
      domain: `test-${Date.now()}@example.com`,
    },
  });
}

async function createTestUser(orgId: string) {
  return prisma.user.create({
    data: {
      email: `user-${Date.now()}@example.com`,
      password: 'test-password-hash',
      role: 'admin',
      orgId,
    },
  });
}

async function createTestLead(orgId: string) {
  return prisma.lead.create({
    data: {
      orgId,
      firstName: 'Test',
      lastName: 'Lead',
      email: 'test-lead@example.com',
      phone: '+1234567890',
      campaignName: 'Test Campaign',
      status: 'new',
    },
  });
}

async function createTestTemplate(orgId: string, userId: string) {
  return prisma.messageTemplate.create({
    data: {
      orgId,
      name: 'Welcome Template',
      channel: 'email',
      subject: 'Welcome to {{company}}',
      body: 'Hi {{firstName}}, welcome to {{company}}! Here\'s your link: {{linkUrl}}',
      variables: {
        required: ['company', 'linkUrl'],
        optional: [],
      },
      createdBy: userId,
    },
  });
}

async function createTestCampaign(orgId: string) {
  return prisma.campaign.create({
    data: {
      orgId,
      name: `Campaign ${Date.now()}`,
      campaignId: `test-campaign-${Date.now()}`,
      budget: 1000,
      spend: 0,
      result: 0,
    },
  });
}

/**
 * Test 1: Complete message flow
 * Create org/lead/campaign/template, enqueue, mark sent
 */
describe('Messaging Integration Tests', () => {
  describe('Test 1: Complete message flow', () => {
    it('should enqueue, retrieve, and mark message as sent', async () => {
      // Setup test data
      const org = await createTestOrganization();
      const user = await createTestUser(org.id);
      const lead = await createTestLead(org.id);
      const template = await createTestTemplate(org.id, user.id);
      await createTestCampaign(org.id);

      try {
        // Create and enqueue message
        const message = await messageQueueService.enqueue({
          orgId: org.id,
          leadId: lead.id,
          channel: 'email',
          recipientEmail: lead.email,
          templateId: template.id,
          subject: template.subject,
          body: 'Test message body',
        });

        // Verify message was enqueued
        expect(message).toBeDefined();
        expect(message.id).toBeTruthy();
        expect(message.status).toBe('pending');
        expect(message.orgId).toBe(org.id);
        expect(message.leadId).toBe(lead.id);
        expect(message.channel).toBe('email');

        // Retrieve pending messages
        const pending = await messageQueueService.getPendingMessages(
          org.id,
          50
        );
        expect(pending.length).toBeGreaterThan(0);
        expect(pending.some((m) => m.id === message.id)).toBe(true);

        // Mark as sent with external ID
        const updated = await messageQueueService.updateStatus(
          message.id,
          'sent',
          { externalId: 'sendgrid-msg-123' }
        );

        expect(updated.status).toBe('sent');
        expect(updated.externalId).toBe('sendgrid-msg-123');
        expect(updated.sentAt).toBeTruthy();

        // Verify it's no longer in pending
        const stillPending = await messageQueueService.getPendingMessages(
          org.id,
          50
        );
        expect(stillPending.some((m) => m.id === message.id)).toBe(false);

        // Log delivery
        const log = await messageQueueService.logDelivery(
          message.id,
          org.id,
          'sent',
          { externalId: 'sendgrid-msg-123' }
        );

        expect(log).toBeDefined();
        expect(log.status).toBe('sent');
        expect(log.queueId).toBe(message.id);
      } finally {
        // Cleanup
        await prisma.messageQueue.deleteMany({ where: { orgId: org.id } });
        await prisma.messageLog.deleteMany({ where: { orgId: org.id } });
        await prisma.messageTemplate.deleteMany({ where: { orgId: org.id } });
        await prisma.lead.deleteMany({ where: { orgId: org.id } });
        await prisma.campaign.deleteMany({ where: { orgId: org.id } });
        await prisma.user.deleteMany({ where: { orgId: org.id } });
        await prisma.organization.delete({ where: { id: org.id } });
      }
    });
  });

  describe('Test 2: Template variable resolution with all types', () => {
    it('should resolve simple variables correctly', () => {
      const template = 'Hello {{firstName}} {{lastName}}';
      const variables = {
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = templateResolver.resolve(template, variables);

      expect(result.isValid).toBe(true);
      expect(result.text).toBe('Hello John Doe');
      expect(result.missing).toEqual([]);
    });

    it('should detect missing required variables', () => {
      const template = 'Company: {{company}}, Contact: {{contact}}';
      const variables = {
        company: 'ACME Corp',
        // contact is missing
      };

      const result = templateResolver.resolve(template, variables);

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('contact');
    });

    it('should handle optional variables gracefully', () => {
      const template =
        'Hello {{firstName}}, your discount code: {{discountCode}}';
      const variables = {
        firstName: 'Jane',
        // discountCode is optional if resolver handles it
      };

      // This test assumes resolver keeps missing vars as-is or removes them
      const result = templateResolver.resolve(template, variables);

      // As long as firstName is resolved, partial resolution should work
      expect(result.text).toContain('Hello Jane');
    });

    it('should handle complex variable names with underscores and numbers', () => {
      const template =
        'Tracking: {{tracking_id_123}}, User: {{user_name_v2}}';
      const variables = {
        tracking_id_123: 'TRACK-001',
        user_name_v2: 'Alice',
      };

      const result = templateResolver.resolve(template, variables);

      expect(result.isValid).toBe(true);
      expect(result.text).toBe(
        'Tracking: TRACK-001, User: Alice'
      );
    });

    it('should handle variables with special characters in values', () => {
      const template = 'URL: {{linkUrl}}, Email: {{email}}';
      const variables = {
        linkUrl: 'https://example.com/path?id=123&token=abc%20def',
        email: 'user+tag@example.co.uk',
      };

      const result = templateResolver.resolve(template, variables);

      expect(result.isValid).toBe(true);
      expect(result.text).toContain('https://example.com/path?id=123&token=abc%20def');
      expect(result.text).toContain('user+tag@example.co.uk');
    });

    it('should handle multiple occurrences of same variable', () => {
      const template = 'Hello {{name}}, your code is {{code}}. {{name}}, please remember your {{code}}.';
      const variables = {
        name: 'Bob',
        code: '12345',
      };

      const result = templateResolver.resolve(template, variables);

      expect(result.isValid).toBe(true);
      expect(result.text).toBe(
        'Hello Bob, your code is 12345. Bob, please remember your 12345.'
      );
    });

    it('should store and reuse resolved template with same variables in database', async () => {
      const org = await createTestOrganization();
      const user = await createTestUser(org.id);
      const lead1 = await createTestLead(org.id);
      const lead2 = await createTestLead(org.id);

      try {
        // Create template
        const template = await prisma.messageTemplate.create({
          data: {
            orgId: org.id,
            name: 'Dynamic Template',
            channel: 'email',
            subject: 'Hi {{firstName}}',
            body: 'Welcome {{firstName}}, your code is {{code}}',
            variables: {
              required: ['code'],
              optional: [],
            },
            createdBy: user.id,
          },
        });

        // Resolve for lead1
        const variables1 = {
          firstName: lead1.firstName,
          code: 'CODE-001',
        };
        const resolved1 = templateResolver.resolve(
          template.body,
          variables1
        );
        expect(resolved1.isValid).toBe(true);

        // Enqueue for lead1
        const message1 = await messageQueueService.enqueue({
          orgId: org.id,
          leadId: lead1.id,
          channel: 'email',
          recipientEmail: lead1.email,
          templateId: template.id,
          subject: 'Hi ' + lead1.firstName,
          body: resolved1.text,
        });

        // Resolve for lead2 (different variables)
        const variables2 = {
          firstName: lead2.firstName,
          code: 'CODE-002',
        };
        const resolved2 = templateResolver.resolve(
          template.body,
          variables2
        );
        expect(resolved2.isValid).toBe(true);

        // Enqueue for lead2
        const message2 = await messageQueueService.enqueue({
          orgId: org.id,
          leadId: lead2.id,
          channel: 'email',
          recipientEmail: lead2.email,
          templateId: template.id,
          subject: 'Hi ' + lead2.firstName,
          body: resolved2.text,
        });

        // Verify both messages have correct resolved content
        const retrieved1 = await prisma.messageQueue.findUnique({
          where: { id: message1.id },
        });
        expect(retrieved1?.body).toContain('CODE-001');

        const retrieved2 = await prisma.messageQueue.findUnique({
          where: { id: message2.id },
        });
        expect(retrieved2?.body).toContain('CODE-002');
      } finally {
        // Cleanup
        await prisma.messageQueue.deleteMany({ where: { orgId: org.id } });
        await prisma.messageTemplate.deleteMany({ where: { orgId: org.id } });
        await prisma.lead.deleteMany({ where: { orgId: org.id } });
        await prisma.user.deleteMany({ where: { orgId: org.id } });
        await prisma.organization.delete({ where: { id: org.id } });
      }
    });
  });

  describe('Test 3: Retry logic with exponential backoff verification', () => {
    it('should schedule retries with exponential backoff', async () => {
      const org = await createTestOrganization();
      const user = await createTestUser(org.id);
      const lead = await createTestLead(org.id);

      try {
        // Create initial message
        const message = await messageQueueService.enqueue({
          orgId: org.id,
          leadId: lead.id,
          channel: 'email',
          recipientEmail: lead.email,
          body: 'Test message',
        });

        expect(message.retryCount).toBe(0);
        expect(message.status).toBe('pending');

        // Schedule first retry (1 min delay)
        const retry1 = await messageQueueService.retryMessage(message.id);
        expect(retry1.success).toBe(true);
        expect(retry1.nextRetryTime).toBeTruthy();

        const msg1 = await prisma.messageQueue.findUnique({
          where: { id: message.id },
        });
        expect(msg1?.retryCount).toBe(1);
        expect(msg1?.status).toBe('pending');

        const delay1Ms = msg1!.scheduledFor!.getTime() - Date.now();
        expect(delay1Ms).toBeGreaterThan(50000); // ~1 min
        expect(delay1Ms).toBeLessThan(70000);

        // Schedule second retry (5 min delay)
        const retry2 = await messageQueueService.retryMessage(message.id);
        expect(retry2.success).toBe(true);

        const msg2 = await prisma.messageQueue.findUnique({
          where: { id: message.id },
        });
        expect(msg2?.retryCount).toBe(2);

        const delay2Ms = msg2!.scheduledFor!.getTime() - Date.now();
        expect(delay2Ms).toBeGreaterThan(280000); // ~5 min
        expect(delay2Ms).toBeLessThan(320000);

        // Schedule third retry (15 min delay)
        const retry3 = await messageQueueService.retryMessage(message.id);
        expect(retry3.success).toBe(true);

        const msg3 = await prisma.messageQueue.findUnique({
          where: { id: message.id },
        });
        expect(msg3?.retryCount).toBe(3);

        const delay3Ms = msg3!.scheduledFor!.getTime() - Date.now();
        expect(delay3Ms).toBeGreaterThan(840000); // ~15 min
        expect(delay3Ms).toBeLessThan(960000);

        // Fourth retry should fail (max retries exceeded)
        const retry4 = await messageQueueService.retryMessage(message.id);
        expect(retry4.success).toBe(false);
        expect(retry4.reason).toContain('max retries');
      } finally {
        // Cleanup
        await prisma.messageQueue.deleteMany({ where: { orgId: org.id } });
        await prisma.lead.deleteMany({ where: { orgId: org.id } });
        await prisma.user.deleteMany({ where: { orgId: org.id } });
        await prisma.organization.delete({ where: { id: org.id } });
      }
    });

    it('should mark message as failed after max retries', async () => {
      const org = await createTestOrganization();
      const user = await createTestUser(org.id);
      const lead = await createTestLead(org.id);

      try {
        // Create message
        const message = await messageQueueService.enqueue({
          orgId: org.id,
          leadId: lead.id,
          channel: 'sms',
          recipientPhone: lead.phone,
          body: 'Test SMS',
        });

        // Exhaust retries
        for (let i = 0; i < 3; i++) {
          await messageQueueService.retryMessage(message.id);
        }

        // Try to retry one more time
        const finalRetry = await messageQueueService.retryMessage(message.id);
        expect(finalRetry.success).toBe(false);

        // Mark as failed
        const failed = await messageQueueService.markAsFailed(
          message.id,
          'Max retries exceeded'
        );

        expect(failed.status).toBe('failed');
        expect(failed.failureReason).toBe('Max retries exceeded');
      } finally {
        // Cleanup
        await prisma.messageQueue.deleteMany({ where: { orgId: org.id } });
        await prisma.lead.deleteMany({ where: { orgId: org.id } });
        await prisma.user.deleteMany({ where: { orgId: org.id } });
        await prisma.organization.delete({ where: { id: org.id } });
      }
    });

    it('should preserve message state during retry cycles', async () => {
      const org = await createTestOrganization();
      const user = await createTestUser(org.id);
      const lead = await createTestLead(org.id);

      try {
        // Create message with specific details
        const message = await messageQueueService.enqueue({
          orgId: org.id,
          leadId: lead.id,
          channel: 'email',
          recipientEmail: lead.email,
          subject: 'Important Subject',
          body: 'Important Body',
        });

        const originalId = message.id;
        const originalOrgId = message.orgId;
        const originalLeadId = message.leadId;
        const originalSubject = message.subject;
        const originalBody = message.body;

        // Trigger retries
        for (let i = 0; i < 2; i++) {
          await messageQueueService.retryMessage(message.id);
        }

        // Verify message details unchanged
        const current = await prisma.messageQueue.findUnique({
          where: { id: originalId },
        });

        expect(current?.id).toBe(originalId);
        expect(current?.orgId).toBe(originalOrgId);
        expect(current?.leadId).toBe(originalLeadId);
        expect(current?.subject).toBe(originalSubject);
        expect(current?.body).toBe(originalBody);
        expect(current?.retryCount).toBe(2);
      } finally {
        // Cleanup
        await prisma.messageQueue.deleteMany({ where: { orgId: org.id } });
        await prisma.lead.deleteMany({ where: { orgId: org.id } });
        await prisma.user.deleteMany({ where: { orgId: org.id } });
        await prisma.organization.delete({ where: { id: org.id } });
      }
    });
  });
});
