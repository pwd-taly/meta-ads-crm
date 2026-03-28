import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeAction, ActionContext, ActionExecutionResult } from '@/lib/workflows/action-executor';
import { prisma } from '@/lib/db';
import { MessageQueueService } from '@/lib/messaging/message-queue-service';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    messageTemplate: {
      findUnique: vi.fn(),
    },
    lead: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    campaign: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock MessageQueueService
vi.mock('@/lib/messaging/message-queue-service');
vi.mock('@/lib/messaging/template-resolver', () => ({
  resolveTemplateVariables: (template: string, variables: any) => {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(`{{${key}}}`, String(value || ''));
    });
    return result;
  },
}));
vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Action Executor', () => {
  let context: ActionContext;

  beforeEach(() => {
    context = {
      orgId: 'org-1',
      entityId: 'lead-1',
      entityType: 'lead',
      entity: {
        id: 'lead-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        campaignName: 'Summer Campaign',
        adName: 'Ad 1',
        customValues: {},
      },
      userId: 'user-1',
    };
    vi.clearAllMocks();
  });

  describe('SEND_MESSAGE action', () => {
    const mockTemplate = {
      id: 'template-1',
      orgId: 'org-1',
      name: 'Welcome Email',
      channel: 'email',
      subject: 'Welcome {{firstName}}!',
      body: 'Hi {{fullName}}, welcome!',
      variables: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
    };

    const mockMessage = {
      id: 'msg-1',
      orgId: 'org-1',
      leadId: 'lead-1',
      channel: 'email',
      templateId: 'template-1',
      status: 'pending',
      body: 'Hi John Doe, welcome!',
      subject: 'Welcome John!',
      recipientEmail: 'john@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should send email message', async () => {
      vi.mocked(prisma.messageTemplate.findUnique).mockResolvedValueOnce(mockTemplate as any);
      vi.mocked(MessageQueueService.prototype.enqueue).mockResolvedValueOnce(mockMessage as any);

      const action = {
        type: 'SEND_MESSAGE',
        config: {
          channel: 'email',
          templateId: 'template-1',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.output?.messageId).toBe('msg-1');
      expect(result.output?.channel).toBe('email');
    });

    it('should send SMS message', async () => {
      const smsTemplate = {
        ...mockTemplate,
        channel: 'sms',
        subject: null,
        body: 'Hi {{firstName}}, thanks for signing up!',
      };
      vi.mocked(prisma.messageTemplate.findUnique).mockResolvedValueOnce(smsTemplate as any);
      vi.mocked(MessageQueueService.prototype.enqueue).mockResolvedValueOnce({
        ...mockMessage,
        channel: 'sms',
        recipientEmail: undefined,
        recipientPhone: '+1234567890',
        subject: null,
      } as any);

      const action = {
        type: 'SEND_MESSAGE',
        config: {
          channel: 'sms',
          templateId: 'template-1',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.output?.channel).toBe('sms');
    });

    it('should fail when template not found', async () => {
      vi.mocked(prisma.messageTemplate.findUnique).mockResolvedValueOnce(null);

      const action = {
        type: 'SEND_MESSAGE',
        config: {
          channel: 'email',
          templateId: 'nonexistent',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });

    it('should fail when missing channel', async () => {
      const action = {
        type: 'SEND_MESSAGE',
        config: {
          templateId: 'template-1',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('channel');
    });

    it('should fail for non-lead entities', async () => {
      const campaignContext = { ...context, entityType: 'campaign' as const };
      const action = {
        type: 'SEND_MESSAGE',
        config: {
          channel: 'email',
          templateId: 'template-1',
        },
      };

      const result = await executeAction(action, campaignContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('lead');
    });

    it('should fail when lead has no email', async () => {
      vi.mocked(prisma.messageTemplate.findUnique).mockResolvedValueOnce(mockTemplate as any);
      const noEmailContext = {
        ...context,
        entity: { ...context.entity, email: null },
      };

      const action = {
        type: 'SEND_MESSAGE',
        config: {
          channel: 'email',
          templateId: 'template-1',
        },
      };

      const result = await executeAction(action, noEmailContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });
  });

  describe('UPDATE_FIELD action', () => {
    it('should update lead custom field', async () => {
      vi.mocked(prisma.lead.update).mockResolvedValueOnce({
        ...context.entity,
        customValues: { interest: 'high' },
      } as any);

      const action = {
        type: 'UPDATE_FIELD',
        config: {
          entityType: 'lead',
          fieldId: 'interest',
          value: 'high',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.output?.fieldId).toBe('interest');
      expect(result.output?.newValue).toBe('high');
    });

    it('should update campaign custom field', async () => {
      const campaignContext = {
        ...context,
        entityType: 'campaign' as const,
        entityId: 'campaign-1',
      };
      vi.mocked(prisma.campaign.update).mockResolvedValueOnce({
        ...campaignContext.entity,
        customValues: { region: 'US' },
      } as any);

      const action = {
        type: 'UPDATE_FIELD',
        config: {
          entityType: 'campaign',
          fieldId: 'region',
          value: 'US',
        },
      };

      const result = await executeAction(action, campaignContext);

      expect(result.success).toBe(true);
      expect(result.output?.newValue).toBe('US');
    });

    it('should resolve variable substitution in value', async () => {
      vi.mocked(prisma.lead.update).mockResolvedValueOnce({
        ...context.entity,
        customValues: { greeting: 'Hi John Doe!' },
      } as any);

      const action = {
        type: 'UPDATE_FIELD',
        config: {
          entityType: 'lead',
          fieldId: 'greeting',
          value: 'Hi {{fullName}}!',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.output?.newValue).toContain('John');
    });

    it('should fail when entity type mismatches', async () => {
      const action = {
        type: 'UPDATE_FIELD',
        config: {
          entityType: 'campaign',
          fieldId: 'field',
          value: 'value',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('entity type');
    });

    it('should fail when missing fieldId', async () => {
      const action = {
        type: 'UPDATE_FIELD',
        config: {
          entityType: 'lead',
          value: 'value',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(false);
    });

    it('should handle numeric values', async () => {
      vi.mocked(prisma.lead.update).mockResolvedValueOnce({
        ...context.entity,
        customValues: { score: 100 },
      } as any);

      const action = {
        type: 'UPDATE_FIELD',
        config: {
          entityType: 'lead',
          fieldId: 'score',
          value: 100,
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.output?.newValue).toBe(100);
    });
  });

  describe('CHANGE_STATUS action', () => {
    it('should change lead status', async () => {
      vi.mocked(prisma.lead.update).mockResolvedValueOnce({
        ...context.entity,
        status: 'contacted',
      } as any);

      const action = {
        type: 'CHANGE_STATUS',
        config: {
          entityType: 'lead',
          newStatus: 'contacted',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.output?.newStatus).toBe('contacted');
    });

    it('should change campaign status', async () => {
      const campaignContext = {
        ...context,
        entityType: 'campaign' as const,
        entityId: 'campaign-1',
      };
      vi.mocked(prisma.campaign.update).mockResolvedValueOnce({
        ...campaignContext.entity,
        status: 'paused',
      } as any);

      const action = {
        type: 'CHANGE_STATUS',
        config: {
          entityType: 'campaign',
          newStatus: 'paused',
        },
      };

      const result = await executeAction(action, campaignContext);

      expect(result.success).toBe(true);
      expect(result.output?.newStatus).toBe('paused');
    });

    it('should fail when entity type mismatches', async () => {
      const action = {
        type: 'CHANGE_STATUS',
        config: {
          entityType: 'campaign',
          newStatus: 'paused',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('entity type');
    });

    it('should fail when missing newStatus', async () => {
      const action = {
        type: 'CHANGE_STATUS',
        config: {
          entityType: 'lead',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(false);
    });
  });

  describe('ADD_TO_CAMPAIGN action', () => {
    it('should add lead to campaign', async () => {
      vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
        ...context.entity,
        campaignId: null,
      } as any);
      vi.mocked(prisma.lead.update).mockResolvedValueOnce({
        ...context.entity,
        campaignId: 'campaign-1',
      } as any);

      const action = {
        type: 'ADD_TO_CAMPAIGN',
        config: {
          campaignId: 'campaign-1',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.output?.campaignId).toBe('campaign-1');
      expect(result.output?.added).toBe(true);
    });

    it('should not add if already in campaign', async () => {
      vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
        ...context.entity,
        campaignId: 'campaign-1',
      } as any);

      const action = {
        type: 'ADD_TO_CAMPAIGN',
        config: {
          campaignId: 'campaign-1',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.output?.added).toBe(false);
    });

    it('should fail for non-lead entities', async () => {
      const campaignContext = {
        ...context,
        entityType: 'campaign' as const,
      };

      const action = {
        type: 'ADD_TO_CAMPAIGN',
        config: {
          campaignId: 'campaign-1',
        },
      };

      const result = await executeAction(action, campaignContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('lead');
    });

    it('should fail when missing campaignId', async () => {
      const action = {
        type: 'ADD_TO_CAMPAIGN',
        config: {},
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(false);
    });
  });

  describe('REMOVE_FROM_CAMPAIGN action', () => {
    it('should remove lead from campaign', async () => {
      vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
        ...context.entity,
        campaignId: 'campaign-1',
      } as any);
      vi.mocked(prisma.lead.update).mockResolvedValueOnce({
        ...context.entity,
        campaignId: null,
      } as any);

      const action = {
        type: 'REMOVE_FROM_CAMPAIGN',
        config: {
          campaignId: 'campaign-1',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.output?.campaignId).toBe('campaign-1');
      expect(result.output?.removed).toBe(true);
    });

    it('should not remove if not in campaign', async () => {
      vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
        ...context.entity,
        campaignId: 'campaign-2',
      } as any);

      const action = {
        type: 'REMOVE_FROM_CAMPAIGN',
        config: {
          campaignId: 'campaign-1',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.output?.removed).toBe(false);
    });

    it('should fail for non-lead entities', async () => {
      const campaignContext = {
        ...context,
        entityType: 'campaign' as const,
      };

      const action = {
        type: 'REMOVE_FROM_CAMPAIGN',
        config: {
          campaignId: 'campaign-1',
        },
      };

      const result = await executeAction(action, campaignContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('lead');
    });

    it('should fail when missing campaignId', async () => {
      const action = {
        type: 'REMOVE_FROM_CAMPAIGN',
        config: {},
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(false);
    });
  });

  describe('CREATE_TASK action', () => {
    it('should create task with title', async () => {
      const action = {
        type: 'CREATE_TASK',
        config: {
          title: 'Follow up with John',
          description: 'Check on interest',
          dueInDays: 3,
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.output?.title).toBe('Follow up with John');
      expect(result.output?.taskId).toBeDefined();
    });

    it('should use default dueInDays of 0', async () => {
      const action = {
        type: 'CREATE_TASK',
        config: {
          title: 'Immediate task',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.output?.dueDate).toBeDefined();
    });

    it('should handle max dueInDays', async () => {
      const action = {
        type: 'CREATE_TASK',
        config: {
          title: 'Task 30 days out',
          dueInDays: 30,
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(true);
    });

    it('should fail when missing title', async () => {
      const action = {
        type: 'CREATE_TASK',
        config: {
          dueInDays: 3,
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('title');
    });

    it('should fail when dueInDays < 0', async () => {
      const action = {
        type: 'CREATE_TASK',
        config: {
          title: 'Task',
          dueInDays: -1,
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('dueInDays');
    });

    it('should fail when dueInDays > 30', async () => {
      const action = {
        type: 'CREATE_TASK',
        config: {
          title: 'Task',
          dueInDays: 31,
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('dueInDays');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should fail for invalid action type', async () => {
      const action = {
        type: 'INVALID_ACTION',
        config: {},
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown');
    });

    it('should fail for action without type', async () => {
      const action = { config: {} };

      const result = await executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid action');
    });

    it('should fail for null action', async () => {
      const result = await executeAction(null, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail for undefined action', async () => {
      const result = await executeAction(undefined, context);

      expect(result.success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.lead.findUnique).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const action = {
        type: 'ADD_TO_CAMPAIGN',
        config: {
          campaignId: 'campaign-1',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database');
    });

    it('should handle malformed template errors', async () => {
      vi.mocked(prisma.messageTemplate.findUnique).mockResolvedValueOnce(null);

      const action = {
        type: 'SEND_MESSAGE',
        config: {
          channel: 'email',
          templateId: 'template-1',
        },
      };

      const result = await executeAction(action, context);

      expect(result.success).toBe(false);
    });
  });
});
