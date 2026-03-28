import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, ApiContext } from '@/lib/api-middleware';
import logger from '@/lib/logger';

const handler = async (request: NextRequest, context: ApiContext) => {
  const { orgId } = context;
  const { searchParams } = request.nextUrl;

  if (request.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Get pagination params
    let limit = parseInt(searchParams.get('limit') || '50', 10);
    let offset = parseInt(searchParams.get('offset') || '0', 10);

    // Validate limit (1-500)
    if (isNaN(limit) || limit < 1 || limit > 500) {
      limit = 50;
    }
    if (isNaN(offset) || offset < 0) {
      offset = 0;
    }

    // Get optional filters
    const statusFilter = searchParams.get('status');
    const workflowIdFilter = searchParams.get('workflowId');

    // Build query filter
    const where: any = {
      orgId,
    };

    if (statusFilter && ['pending', 'running', 'success', 'partial', 'failed', 'completed'].includes(statusFilter)) {
      where.status = statusFilter;
    }

    if (workflowIdFilter) {
      where.workflowId = workflowIdFilter;
    }

    // Get executions with workflow info and total count
    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where,
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
              entityType: true,
            },
          },
        },
        orderBy: { triggeredAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.workflowExecution.count({ where }),
    ]);

    // Format response to include workflow details inline
    const formattedExecutions = executions.map((execution) => ({
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: execution.workflow.name,
      workflowEntityType: execution.workflow.entityType,
      entityId: execution.entityId,
      entityType: execution.entityType,
      triggeredAt: execution.triggeredAt,
      completedAt: execution.completedAt,
      status: execution.status,
      conditionsMet: execution.conditionsMet,
      actionResults: execution.actionResults,
      errorMessage: execution.errorMessage,
    }));

    logger.info('Org-wide workflow executions retrieved', {
      orgId,
      count: executions.length,
      total,
    });

    return NextResponse.json({
      executions: formattedExecutions,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to retrieve executions', {
      orgId,
      error: errorMsg,
    });
    return NextResponse.json(
      { error: 'Failed to retrieve executions' },
      { status: 500 }
    );
  }
};

export const GET = requireRole('admin', handler);
