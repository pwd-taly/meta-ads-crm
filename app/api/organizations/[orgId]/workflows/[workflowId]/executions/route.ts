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

    // Get status filter if provided
    const statusFilter = searchParams.get('status');

    // Verify workflow exists and belongs to org
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

    // Build query filter
    const where: any = {
      workflowId,
      orgId,
    };

    if (statusFilter && ['pending', 'running', 'success', 'partial', 'failed', 'completed'].includes(statusFilter)) {
      where.status = statusFilter;
    }

    // Get executions and total count
    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where,
        select: {
          id: true,
          entityId: true,
          entityType: true,
          triggeredAt: true,
          completedAt: true,
          status: true,
          conditionsMet: true,
          actionResults: true,
          errorMessage: true,
        },
        orderBy: { triggeredAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.workflowExecution.count({ where }),
    ]);

    logger.info('Workflow executions retrieved', {
      orgId,
      workflowId,
      count: executions.length,
      total,
    });

    return NextResponse.json({
      executions,
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
      workflowId,
      error: errorMsg,
    });
    return NextResponse.json(
      { error: 'Failed to retrieve executions' },
      { status: 500 }
    );
  }
};

export const GET = requireRole('admin', handler);
