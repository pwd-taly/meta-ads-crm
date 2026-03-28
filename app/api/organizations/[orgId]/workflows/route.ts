import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, ApiContext } from '@/lib/api-middleware';
import logger from '@/lib/logger';

const handler = async (request: NextRequest, context: ApiContext) => {
  const { orgId } = context;
  const { searchParams } = request.nextUrl;

  // GET - List workflows
  if (request.method === 'GET') {
    try {
      const entityType = searchParams.get('entityType');
      const isActiveStr = searchParams.get('isActive');

      const where: any = { orgId };

      if (entityType && ['lead', 'campaign'].includes(entityType)) {
        where.entityType = entityType;
      }

      if (isActiveStr !== null) {
        where.isActive = isActiveStr === 'true';
      }

      const workflows = await prisma.workflow.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          entityType: true,
          isActive: true,
          trigger: true,
          conditions: true,
          conditionLogic: true,
          actions: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      logger.info('Workflows listed', { orgId, count: workflows.length });
      return NextResponse.json(workflows);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to list workflows', { orgId, error: errorMsg });
      return NextResponse.json(
        { error: 'Failed to list workflows' },
        { status: 500 }
      );
    }
  }

  // POST - Create workflow
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const { name, description, entityType, trigger, conditions, conditionLogic, actions } = body;
      const userId = context.userId;

      // Validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Workflow name is required and must not be empty' },
          { status: 400 }
        );
      }

      if (!entityType || !['lead', 'campaign'].includes(entityType)) {
        return NextResponse.json(
          { error: 'Invalid entityType. Must be "lead" or "campaign"' },
          { status: 400 }
        );
      }

      if (!trigger || !trigger.type) {
        return NextResponse.json(
          { error: 'Trigger with type is required' },
          { status: 400 }
        );
      }

      const validTriggerTypes = ['ENTITY_CREATED', 'FIELD_CHANGED', 'STATUS_CHANGED', 'SCORE_THRESHOLD', 'TIME_BASED'];
      if (!validTriggerTypes.includes(trigger.type)) {
        return NextResponse.json(
          { error: `Invalid trigger type. Must be one of: ${validTriggerTypes.join(', ')}` },
          { status: 400 }
        );
      }

      const conditionsArray = conditions || [];
      if (!Array.isArray(conditionsArray)) {
        return NextResponse.json(
          { error: 'Conditions must be an array' },
          { status: 400 }
        );
      }

      const actionsArray = actions || [];
      if (!Array.isArray(actionsArray)) {
        return NextResponse.json(
          { error: 'Actions must be an array' },
          { status: 400 }
        );
      }

      const logic = conditionLogic || 'AND';
      if (!['AND', 'OR'].includes(logic.toUpperCase())) {
        return NextResponse.json(
          { error: 'Condition logic must be "AND" or "OR"' },
          { status: 400 }
        );
      }

      // Create workflow with isActive=false
      const workflow = await prisma.workflow.create({
        data: {
          orgId,
          name: name.trim(),
          description,
          entityType,
          trigger,
          conditions: conditionsArray,
          conditionLogic: logic.toUpperCase(),
          actions: actionsArray,
          isActive: false,
          createdBy: userId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          entityType: true,
          isActive: true,
          trigger: true,
          conditions: true,
          conditionLogic: true,
          actions: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info('Workflow created', {
        orgId,
        workflowId: workflow.id,
        name: workflow.name,
      });

      return NextResponse.json(workflow, { status: 201 });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to create workflow', { orgId, error: errorMsg });
      return NextResponse.json(
        { error: 'Failed to create workflow' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
};

export const GET = requireRole('admin', handler);
export const POST = requireRole('admin', handler);
