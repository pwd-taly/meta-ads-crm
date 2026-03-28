/**
 * Workflow Orchestration Engine
 *
 * Orchestrates the complete workflow execution lifecycle:
 * 1. Trigger evaluation
 * 2. Condition evaluation
 * 3. Action execution
 * 4. Result logging
 */

import { prisma } from '@/lib/db';
import { evaluateTrigger, TriggerContext } from './trigger-evaluator';
import { evaluateConditions, Condition } from './condition-evaluator';
import { executeAction, ActionContext, ActionExecutionResult } from './action-executor';
import logger from '@/lib/logger';

export interface WorkflowExecutionContext {
  workflowId: string;
  orgId: string;
  entityId: string;
  entityType: 'lead' | 'campaign';
  entity: any;
  triggerContext: TriggerContext;
  userId?: string;
}

export interface ActionResult {
  actionIndex: number;
  status: 'success' | 'failed';
  output?: any;
  error?: string;
}

/**
 * Executes a complete workflow from trigger to actions
 *
 * @param context - Workflow execution context
 */
export async function executeWorkflow(context: WorkflowExecutionContext): Promise<void> {
  const startTime = Date.now();
  let execution: any;

  try {
    // 1. Create execution record with status="running"
    execution = await prisma.workflowExecution.create({
      data: {
        workflowId: context.workflowId,
        orgId: context.orgId,
        entityId: context.entityId,
        entityType: context.entityType,
        status: 'running',
      },
    });

    logger.info('Workflow execution started', {
      executionId: execution.id,
      workflowId: context.workflowId,
      entityId: context.entityId,
    });

    // 2. Fetch workflow from DB
    const workflow = await prisma.workflow.findUnique({
      where: { id: context.workflowId },
    });

    if (!workflow) {
      await updateExecution(execution.id, {
        status: 'failed',
        errorMessage: 'Workflow not found',
        completedAt: new Date(),
      });
      return;
    }

    // 3. Check workflow is active
    if (!workflow.isActive) {
      await updateExecution(execution.id, {
        status: 'success',
        conditionsMet: false,
        completedAt: new Date(),
      });
      logger.info('Workflow not active', { workflowId: context.workflowId });
      return;
    }

    // 4. Evaluate trigger
    const trigger = workflow.trigger;
    const triggerMatches = evaluateTrigger(trigger, context.triggerContext);

    if (!triggerMatches) {
      await updateExecution(execution.id, {
        status: 'success',
        conditionsMet: false,
        completedAt: new Date(),
      });
      logger.info('Trigger did not match', {
        executionId: execution.id,
        workflowId: context.workflowId,
      });
      return;
    }

    logger.info('Trigger matched', { executionId: execution.id });

    // 5. Evaluate conditions
    const conditions = workflow.conditions as Condition[];
    const conditionLogic = workflow.conditionLogic || 'AND';
    const conditionsMet = evaluateConditions(conditions, conditionLogic, context.entity);

    if (!conditionsMet) {
      await updateExecution(execution.id, {
        status: 'success',
        conditionsMet: false,
        completedAt: new Date(),
      });
      logger.info('Conditions not met', {
        executionId: execution.id,
        workflowId: context.workflowId,
      });
      return;
    }

    logger.info('Conditions met', { executionId: execution.id });

    // 6. Execute actions in sequence
    const actions = workflow.actions as any[];
    const actionResults: ActionResult[] = [];
    let anyFailed = false;

    const actionContext: ActionContext = {
      orgId: context.orgId,
      entityId: context.entityId,
      entityType: context.entityType,
      entity: context.entity,
      userId: context.userId,
    };

    for (let i = 0; i < actions.length; i++) {
      try {
        const action = actions[i];
        const result = await executeAction(action, actionContext);

        const actionResult: ActionResult = {
          actionIndex: i,
          status: result.success ? 'success' : 'failed',
          output: result.output,
          error: result.error,
        };

        actionResults.push(actionResult);

        if (!result.success) {
          anyFailed = true;
          logger.warn('Action failed', {
            executionId: execution.id,
            actionIndex: i,
            error: result.error,
          });
        } else {
          logger.info('Action executed', {
            executionId: execution.id,
            actionIndex: i,
          });
        }

        // Continue even if action fails (don't stop)
      } catch (error) {
        anyFailed = true;
        const errorMsg = error instanceof Error ? error.message : String(error);
        actionResults.push({
          actionIndex: i,
          status: 'failed',
          error: errorMsg,
        });
        logger.error('Action execution error', {
          executionId: execution.id,
          actionIndex: i,
          error: errorMsg,
        });
      }
    }

    // 7. Determine final status
    let finalStatus: 'success' | 'partial' | 'failed';
    if (!anyFailed) {
      finalStatus = 'success';
    } else if (actionResults.length > 0 && actionResults.some(r => r.status === 'success')) {
      finalStatus = 'partial';
    } else {
      finalStatus = 'failed';
    }

    // 8. Update execution with final status
    await updateExecution(execution.id, {
      status: finalStatus,
      conditionsMet: true,
      actionResults: actionResults,
      completedAt: new Date(),
    });

    const duration = Date.now() - startTime;
    logger.info('Workflow execution completed', {
      executionId: execution.id,
      workflowId: context.workflowId,
      status: finalStatus,
      duration,
      actionResults: actionResults.length,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Workflow execution failed', {
      workflowId: context.workflowId,
      entityId: context.entityId,
      error: errorMsg,
    });

    if (execution) {
      await updateExecution(execution.id, {
        status: 'failed',
        errorMessage: errorMsg,
        completedAt: new Date(),
      });
    }
  }
}

/**
 * Triggers workflows for an entity when it's created or updated
 *
 * @param orgId - Organization ID
 * @param entityType - Type of entity ("lead" or "campaign")
 * @param entityId - Entity ID
 * @param entity - Full entity object
 * @param triggerType - Type of trigger that occurred
 * @param triggerContext - Trigger context data
 */
export async function triggerWorkflowsForEntity(
  orgId: string,
  entityType: 'lead' | 'campaign',
  entityId: string,
  entity: any,
  triggerType: string,
  triggerContext: TriggerContext
): Promise<void> {
  try {
    // Query all active workflows for org + entityType
    const workflows = await prisma.workflow.findMany({
      where: {
        orgId,
        entityType,
        isActive: true,
      },
    });

    logger.info('Found workflows to evaluate', {
      orgId,
      entityType,
      count: workflows.length,
    });

    // Execute each matching workflow
    for (const workflow of workflows) {
      const executionContext: WorkflowExecutionContext = {
        workflowId: workflow.id,
        orgId,
        entityId,
        entityType,
        entity,
        triggerContext,
      };

      // Execute asynchronously without waiting
      // In production, this should be queued for background processing
      executeWorkflow(executionContext).catch(error => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Failed to execute workflow', {
          workflowId: workflow.id,
          error: errorMsg,
        });
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to trigger workflows', {
      orgId,
      entityType,
      entityId,
      error: errorMsg,
    });
  }
}

/**
 * Updates a workflow execution record
 */
async function updateExecution(
  executionId: string,
  updates: {
    status?: string;
    conditionsMet?: boolean;
    actionResults?: ActionResult[];
    errorMessage?: string;
    completedAt?: Date;
  }
): Promise<void> {
  try {
    const data: any = {
      status: updates.status,
      completedAt: updates.completedAt,
    };

    if (updates.conditionsMet !== undefined) {
      data.conditionsMet = updates.conditionsMet;
    }

    if (updates.actionResults) {
      data.actionResults = updates.actionResults;
    }

    if (updates.errorMessage) {
      data.errorMessage = updates.errorMessage;
    }

    await prisma.workflowExecution.update({
      where: { id: executionId },
      data,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to update execution', {
      executionId,
      error: errorMsg,
    });
  }
}
