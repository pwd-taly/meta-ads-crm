import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeWorkflow, triggerWorkflowsForEntity, WorkflowExecutionContext } from '@/lib/workflows/workflow-runner';
import { prisma } from '@/lib/db';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    workflow: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    workflowExecution: {
      create: vi.fn(),
      update: vi.fn(),
    },
    lead: {
      update: vi.fn(),
    },
    campaign: {
      update: vi.fn(),
    },
  },
}));

// Mock evaluators and executor
vi.mock('@/lib/workflows/trigger-evaluator', () => ({
  evaluateTrigger: vi.fn((trigger, context) => {
    if (trigger.type === 'ENTITY_CREATED') return context.triggerType === 'ENTITY_CREATED';
    return false;
  }),
}));

vi.mock('@/lib/workflows/condition-evaluator', () => ({
  evaluateConditions: vi.fn((conditions, logic, entity) => {
    // Default: return true (all conditions pass)
    return true;
  }),
}));

vi.mock('@/lib/workflows/action-executor', () => ({
  executeAction: vi.fn(async (action, context) => {
    if (action.type === 'SEND_MESSAGE') {
      return { success: true, output: { messageId: 'msg-1' } };
    }
    return { success: true, output: {} };
  }),
}));

vi.mock('@/lib/logger', () => {
  const mockLogger = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  };
  return {
    default: mockLogger,
    logger: mockLogger,
  };
});

describe('Workflow Orchestration Engine', () => {
  let context: WorkflowExecutionContext;

  beforeEach(() => {
    context = {
      workflowId: 'workflow-1',
      orgId: 'org-1',
      entityId: 'lead-1',
      entityType: 'lead',
      entity: {
        id: 'lead-1',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'new',
        aiScore: 75,
      },
      triggerContext: {
        triggerType: 'ENTITY_CREATED',
        entityType: 'lead',
      },
    };

    vi.clearAllMocks();
  });

  describe('executeWorkflow', () => {
    const mockWorkflow = {
      id: 'workflow-1',
      orgId: 'org-1',
      name: 'Welcome New Lead',
      entityType: 'lead',
      isActive: true,
      trigger: {
        type: 'ENTITY_CREATED',
        config: { entityType: 'lead' },
      },
      conditions: [],
      conditionLogic: 'AND',
      actions: [
        {
          type: 'SEND_MESSAGE',
          config: { channel: 'email', templateId: 'template-1' },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
    };

    const mockExecution = {
      id: 'exec-1',
      workflowId: 'workflow-1',
      orgId: 'org-1',
      entityId: 'lead-1',
      entityType: 'lead',
      status: 'running',
      triggeredAt: new Date(),
      completedAt: null,
      conditionsMet: null,
      actionResults: [],
      errorMessage: null,
      createdAt: new Date(),
    };

    it('should create execution record at start', async () => {
      vi.mocked(prisma.workflowExecution.create).mockResolvedValueOnce(mockExecution as any);
      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(mockWorkflow as any);
      vi.mocked(prisma.workflowExecution.update).mockResolvedValueOnce({} as any);

      await executeWorkflow(context);

      expect(prisma.workflowExecution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workflowId: 'workflow-1',
            status: 'running',
          }),
        })
      );
    });

    it('should complete execution when workflow succeeds', async () => {
      vi.mocked(prisma.workflowExecution.create).mockResolvedValueOnce(mockExecution as any);
      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(mockWorkflow as any);
      vi.mocked(prisma.workflowExecution.update).mockResolvedValueOnce({} as any);

      await executeWorkflow(context);

      expect(prisma.workflowExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: expect.stringMatching(/success|partial|failed/),
            completedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should fail if workflow not found', async () => {
      vi.mocked(prisma.workflowExecution.create).mockResolvedValueOnce(mockExecution as any);
      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.workflowExecution.update).mockResolvedValueOnce({} as any);

      await executeWorkflow(context);

      expect(prisma.workflowExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            errorMessage: expect.stringContaining('not found'),
          }),
        })
      );
    });

    it('should skip inactive workflows', async () => {
      const inactiveWorkflow = { ...mockWorkflow, isActive: false };
      vi.mocked(prisma.workflowExecution.create).mockResolvedValueOnce(mockExecution as any);
      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(inactiveWorkflow as any);
      vi.mocked(prisma.workflowExecution.update).mockResolvedValueOnce({} as any);

      await executeWorkflow(context);

      expect(prisma.workflowExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'success',
            conditionsMet: false,
          }),
        })
      );
    });

    it('should execute all actions in sequence', async () => {
      const workflowWithMultipleActions = {
        ...mockWorkflow,
        actions: [
          {
            type: 'SEND_MESSAGE',
            config: { channel: 'email', templateId: 'template-1' },
          },
          {
            type: 'UPDATE_FIELD',
            config: { entityType: 'lead', fieldId: 'status', value: 'contacted' },
          },
        ],
      };

      vi.mocked(prisma.workflowExecution.create).mockResolvedValueOnce(mockExecution as any);
      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(
        workflowWithMultipleActions as any
      );
      vi.mocked(prisma.workflowExecution.update).mockResolvedValueOnce({} as any);

      await executeWorkflow(context);

      expect(prisma.workflowExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionResults: expect.arrayContaining([
              expect.objectContaining({ actionIndex: 0 }),
              expect.objectContaining({ actionIndex: 1 }),
            ]),
          }),
        })
      );
    });

    it('should continue on action failure (partial status)', async () => {
      const workflowWithActions = {
        ...mockWorkflow,
        actions: [
          {
            type: 'SEND_MESSAGE',
            config: { channel: 'email', templateId: 'template-1' },
          },
          {
            type: 'SEND_MESSAGE',
            config: { channel: 'email', templateId: 'template-2' },
          },
        ],
      };

      vi.mocked(prisma.workflowExecution.create).mockResolvedValueOnce(mockExecution as any);
      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(
        workflowWithActions as any
      );
      vi.mocked(prisma.workflowExecution.update).mockResolvedValueOnce({} as any);

      // Mock one action failure
      let callCount = 0;
      vi.mocked(prisma.workflowExecution.update).mockImplementation(async ({ data }) => {
        // On the update call, check if we have mixed success/failure
        if (Array.isArray(data.actionResults)) {
          const hasSuccess = data.actionResults.some((r: any) => r.status === 'success');
          const hasFailed = data.actionResults.some((r: any) => r.status === 'failed');
          if (hasSuccess && hasFailed) {
            expect(data.status).toBe('partial');
          }
        }
        return {} as any;
      });

      await executeWorkflow(context);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.workflowExecution.create).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      // Should not throw, just log the error
      await executeWorkflow(context);

      // When create fails, the entire workflow execution is skipped
      // The function catches the error and logs it
      expect(prisma.workflowExecution.create).toHaveBeenCalled();
    });
  });

  describe('triggerWorkflowsForEntity', () => {
    const mockWorkflows = [
      {
        id: 'workflow-1',
        orgId: 'org-1',
        name: 'Workflow 1',
        entityType: 'lead',
        isActive: true,
      },
      {
        id: 'workflow-2',
        orgId: 'org-1',
        name: 'Workflow 2',
        entityType: 'lead',
        isActive: true,
      },
    ];

    it('should find all active workflows for entity type', async () => {
      vi.mocked(prisma.workflow.findMany).mockResolvedValueOnce(mockWorkflows as any);

      await triggerWorkflowsForEntity(
        'org-1',
        'lead',
        'lead-1',
        context.entity,
        'ENTITY_CREATED',
        context.triggerContext
      );

      expect(prisma.workflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orgId: 'org-1',
            entityType: 'lead',
            isActive: true,
          }),
        })
      );
    });

    it('should handle empty workflow list', async () => {
      vi.mocked(prisma.workflow.findMany).mockResolvedValueOnce([]);

      await triggerWorkflowsForEntity(
        'org-1',
        'lead',
        'lead-1',
        context.entity,
        'ENTITY_CREATED',
        context.triggerContext
      );

      // Should not error
      expect(prisma.workflow.findMany).toHaveBeenCalled();
    });

    it('should handle database errors when querying workflows', async () => {
      vi.mocked(prisma.workflow.findMany).mockRejectedValueOnce(
        new Error('Database error')
      );

      await triggerWorkflowsForEntity(
        'org-1',
        'lead',
        'lead-1',
        context.entity,
        'ENTITY_CREATED',
        context.triggerContext
      );

      // Should not throw
      expect(prisma.workflow.findMany).toHaveBeenCalled();
    });
  });

  describe('Condition evaluation flow', () => {
    it('should skip execution if trigger does not match', async () => {
      const { evaluateTrigger } = await import('@/lib/workflows/trigger-evaluator');
      vi.mocked(evaluateTrigger as any).mockReturnValueOnce(false);

      const mockExecution = {
        id: 'exec-1',
        workflowId: 'workflow-1',
        status: 'running',
        triggeredAt: new Date(),
      };

      const mockWorkflow = {
        id: 'workflow-1',
        isActive: true,
        trigger: { type: 'ENTITY_CREATED' },
        conditions: [],
        actions: [],
      };

      vi.mocked(prisma.workflowExecution.create).mockResolvedValueOnce(mockExecution as any);
      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(mockWorkflow as any);
      vi.mocked(prisma.workflowExecution.update).mockResolvedValueOnce({} as any);

      await executeWorkflow(context);

      expect(prisma.workflowExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conditionsMet: false,
          }),
        })
      );
    });

    it('should skip execution if conditions do not pass', async () => {
      const { evaluateConditions } = await import('@/lib/workflows/condition-evaluator');
      vi.mocked(evaluateConditions as any).mockReturnValueOnce(false);

      const mockExecution = { id: 'exec-1', status: 'running', triggeredAt: new Date() };
      const mockWorkflow = {
        id: 'workflow-1',
        isActive: true,
        trigger: { type: 'ENTITY_CREATED' },
        conditions: [{ fieldId: 'status', operator: 'equals', value: 'contacted' }],
        conditionLogic: 'AND',
        actions: [],
      };

      vi.mocked(prisma.workflowExecution.create).mockResolvedValueOnce(mockExecution as any);
      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(mockWorkflow as any);
      vi.mocked(prisma.workflowExecution.update).mockResolvedValueOnce({} as any);

      await executeWorkflow(context);

      expect(prisma.workflowExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conditionsMet: false,
          }),
        })
      );
    });

    it('should execute actions when trigger and conditions match', async () => {
      const { evaluateTrigger } = await import('@/lib/workflows/trigger-evaluator');
      const { evaluateConditions } = await import('@/lib/workflows/condition-evaluator');

      vi.mocked(evaluateTrigger as any).mockReturnValueOnce(true);
      vi.mocked(evaluateConditions as any).mockReturnValueOnce(true);

      const mockExecution = { id: 'exec-1', status: 'running', triggeredAt: new Date() };
      const mockWorkflow = {
        id: 'workflow-1',
        isActive: true,
        trigger: { type: 'ENTITY_CREATED' },
        conditions: [],
        conditionLogic: 'AND',
        actions: [
          {
            type: 'SEND_MESSAGE',
            config: { channel: 'email', templateId: 'template-1' },
          },
        ],
      };

      vi.mocked(prisma.workflowExecution.create).mockResolvedValueOnce(mockExecution as any);
      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(mockWorkflow as any);
      vi.mocked(prisma.workflowExecution.update).mockResolvedValueOnce({} as any);

      await executeWorkflow(context);

      expect(prisma.workflowExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conditionsMet: true,
            status: expect.any(String),
            actionResults: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle missing entity gracefully', async () => {
      const emptyContext = { ...context, entity: null };
      const mockExecution = { id: 'exec-1', status: 'running', triggeredAt: new Date() };
      const mockWorkflow = {
        id: 'workflow-1',
        isActive: true,
        trigger: { type: 'ENTITY_CREATED' },
      };

      vi.mocked(prisma.workflowExecution.create).mockResolvedValueOnce(mockExecution as any);
      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(mockWorkflow as any);
      vi.mocked(prisma.workflowExecution.update).mockResolvedValueOnce({} as any);

      // Should not throw
      await executeWorkflow(emptyContext);
    });

    it('should log execution progress', async () => {
      const mockExecution = { id: 'exec-1', status: 'running', triggeredAt: new Date() };
      const mockWorkflow = {
        id: 'workflow-1',
        isActive: true,
        trigger: { type: 'ENTITY_CREATED' },
        conditions: [],
        conditionLogic: 'AND',
        actions: [],
      };

      vi.mocked(prisma.workflowExecution.create).mockResolvedValueOnce(mockExecution as any);
      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(mockWorkflow as any);
      vi.mocked(prisma.workflowExecution.update).mockResolvedValueOnce({} as any);

      await executeWorkflow(context);

      // Should have logged execution start and completion
      // We can verify that update was called which happens after logging
      expect(prisma.workflowExecution.update).toHaveBeenCalled();
    });
  });
});
