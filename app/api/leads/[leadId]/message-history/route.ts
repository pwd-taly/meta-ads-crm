import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, ApiContext } from '@/lib/api-middleware';
import logger from '@/lib/logger';
import { getPaginationParams, createPaginationResponse } from '@/lib/pagination';

interface RouteContext {
  params: {
    leadId: string;
  };
}

const handler = async (
  request: NextRequest,
  context: ApiContext,
  routeContext: RouteContext
) => {
  if (request.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { orgId } = context;
    const { leadId } = routeContext.params;
    const { searchParams } = request.nextUrl;

    // Verify lead exists and belongs to org
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, orgId },
      select: { id: true },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get pagination
    const { page, limit } = getPaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      leadId,
      orgId,
    };

    // Optional filters
    const channel = searchParams.get('channel');
    if (channel && channel !== 'all') {
      where.channel = channel;
    }

    const status = searchParams.get('status');
    if (status && status !== 'all') {
      where.status = status;
    }

    // Get message history with pagination
    const [messages, total] = await Promise.all([
      prisma.messageQueue.findMany({
        where,
        select: {
          id: true,
          channel: true,
          subject: true,
          body: true,
          status: true,
          deliveryStatus: true,
          sentAt: true,
          failureReason: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.messageQueue.count({ where }),
    ]);

    const response = createPaginationResponse(messages, total, page, limit);

    logger.info('Message history retrieved', {
      orgId,
      leadId,
      count: messages.length,
    });

    return NextResponse.json(response);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to retrieve message history', {
      orgId: context.orgId,
      error: errorMsg,
    });
    return NextResponse.json(
      { error: 'Failed to retrieve message history' },
      { status: 500 }
    );
  }
};

export const GET = requireAuth(async (request, context) => {
  const leadId = request.nextUrl.pathname.split('/')[3];
  const routeContext = { params: { leadId } };
  return handler(request, context, routeContext);
});
