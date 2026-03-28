import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, ApiContext } from '@/lib/api-middleware';
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

  // GET - Retrieve single workflow
  if (request.method === 'GET') {
    try {
      const workflow = await prisma.workflow.findFirst({
        where: {
          id: workflowId,
          orgId,
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

      if (!workflow) {
        return NextResponse.json(
          { error: 'Workflow not found' },
          { status: 404 }
        );
      }

      logger.info('Workflow retrieved', { orgId, workflowId });
      return NextResponse.json(workflow);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to retrieve workflow', { orgId, workflowId, error: errorMsg });
      return NextResponse.json(
        { error: 'Failed to retrieve workflow' },
        { status: 500 }
      );
    }
  }

  // PUT - Update workflow
  if (request.method === 'PUT') {
    try {
      // Check ownership
      const existing = await prisma.workflow.findFirst({
        where: {
          id: workflowId,
          orgId,
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Workflow not found' },
          { status: 404 }
        );
      }

      const body = await request.json();
      const { name, description, trigger, conditions, conditionLogic, actions, isActive } = body;

      // Build update object
      const updateData: any = {};

      // Validate and add each field if provided
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          return NextResponse.json(
            { error: 'Workflow name must be a non-empty string' },
            { status: 400 }
          );
        }
        updateData.name = name.trim();
      }

      if (description !== undefined) {
        updateData.description = description;
      }

      if (trigger !== undefined) {
        if (!trigger || !trigger.type) {
          return NextResponse.json(
            { error: 'Trigger must have a type property' },
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
        updateData.trigger = trigger;
      }

      if (conditions !== undefined) {
        if (!Array.isArray(conditions)) {
          return NextResponse.json(
            { error: 'Conditions must be an array' },
            { status: 400 }
          );
        }
        updateData.conditions = conditions;
      }

      if (conditionLogic !== undefined) {
        if (!['AND', 'OR'].includes(conditionLogic.toUpperCase())) {
          return NextResponse.json(
            { error: 'Condition logic must be "AND" or "OR"' },
            { status: 400 }
          );
        }
        updateData.conditionLogic = conditionLogic.toUpperCase();
      }

      if (actions !== undefined) {
        if (!Array.isArray(actions)) {
          return NextResponse.json(
            { error: 'Actions must be an array' },
            { status: 400 }
          );
        }
        updateData.actions = actions;
      }

      if (isActive !== undefined) {
        if (typeof isActive !== 'boolean') {
          return NextResponse.json(
            { error: 'isActive must be a boolean' },
            { status: 400 }
          );
        }
        updateData.isActive = isActive;
      }

      // If no fields to update, return error
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'No fields to update' },
          { status: 400 }
        );
      }

      const workflow = await prisma.workflow.update({
        where: { id: workflowId },
        data: updateData,
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

      logger.info('Workflow updated', { orgId, workflowId });
      return NextResponse.json(workflow);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to update workflow', { orgId, workflowId, error: errorMsg });
      return NextResponse.json(
        { error: 'Failed to update workflow' },
        { status: 500 }
      );
    }
  }

  // DELETE - Delete workflow
  if (request.method === 'DELETE') {
    try {
      // Check ownership
      const existing = await prisma.workflow.findFirst({
        where: {
          id: workflowId,
          orgId,
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Workflow not found' },
          { status: 404 }
        );
      }

      await prisma.workflow.delete({
        where: { id: workflowId },
      });

      logger.info('Workflow deleted', { orgId, workflowId });
      return NextResponse.json({ success: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to delete workflow', { orgId, workflowId, error: errorMsg });
      return NextResponse.json(
        { error: 'Failed to delete workflow' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
};

export const GET = requireRole('admin', handler);
export const PUT = requireRole('admin', handler);
export const DELETE = requireRole('admin', handler);
