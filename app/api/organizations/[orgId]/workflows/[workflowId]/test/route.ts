import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, ApiContext } from '@/lib/api-middleware';
import { evaluateTrigger, type TriggerContext } from '@/lib/workflows/trigger-evaluator';
import { evaluateConditions, evaluateCondition, type Condition } from '@/lib/workflows/condition-evaluator';
import logger from '@/lib/logger';

interface RouteContext {
  params: {
    orgId: string;
    workflowId: string;
  };
}

const handler = async (
  request: NextRequest,
  context: ApiContext,
  routeContext: RouteContext
) => {
  const { orgId } = context;
  const { workflowId } = routeContext.params;

  if (request.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { entityId } = body;

    if (!entityId) {
      return NextResponse.json(
        { error: 'entityId is required' },
        { status: 400 }
      );
    }

    // Fetch workflow
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        orgId,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Fetch entity (lead or campaign)
    let entity: any;
    if (workflow.entityType === 'lead') {
      entity = await prisma.lead.findUnique({
        where: { id: entityId },
      });
    } else if (workflow.entityType === 'campaign') {
      entity = await prisma.campaign.findUnique({
        where: { id: entityId },
      });
    }

    if (!entity) {
      return NextResponse.json(
        { error: `${workflow.entityType} not found` },
        { status: 404 }
      );
    }

    // Verify entity belongs to org
    if (entity.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Entity does not belong to this organization' },
        { status: 404 }
      );
    }

    if (!workflow.trigger) {
      return NextResponse.json(
        { error: 'Workflow has no trigger configured' },
        { status: 400 }
      );
    }

    const trigger = workflow.trigger as { type: string; [key: string]: unknown };

    // Create generic trigger context
    const triggerContext: TriggerContext = {
      triggerType: trigger.type,
      entityType: workflow.entityType,
    };

    // Evaluate trigger
    const triggerMatches = evaluateTrigger(workflow.trigger, triggerContext);

    // Evaluate conditions
    const conditions = ((workflow.conditions as unknown) as Condition[]) || [];
    const conditionLogic = workflow.conditionLogic || 'AND';
    const conditionsMet = evaluateConditions(conditions, conditionLogic, entity);

    // Build condition details
    const conditionDetails = conditions.map((condition, index) => {
      const fieldValue = entity[condition.fieldId] || entity.customValues?.[condition.fieldId];
      const matched = evaluateCondition(condition, entity);
      return {
        index,
        fieldId: condition.fieldId,
        operator: condition.operator,
        value: condition.value,
        entityValue: fieldValue,
        matched,
      };
    });

    // Build response
    const response = {
      triggerMatches,
      conditionsMet,
      actionsWouldExecute: conditionsMet ? (workflow.actions || []) : [],
      details: {
        trigger: {
          type: trigger.type,
          matched: triggerMatches,
        },
        conditions: {
          logic: conditionLogic,
          count: conditions.length,
          allMet: conditionsMet,
          details: conditionDetails,
        },
      },
    };

    logger.info('Workflow test executed', {
      orgId,
      workflowId,
      entityType: workflow.entityType,
      entityId,
      triggerMatches,
      conditionsMet,
    });

    return NextResponse.json(response);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to test workflow', {
      orgId,
      workflowId,
      error: errorMsg,
    });
    return NextResponse.json(
      { error: 'Failed to test workflow' },
      { status: 500 }
    );
  }
};

export const POST = requireRole('admin', handler);
