import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, ApiContext } from '@/lib/api-middleware';
import logger from '@/lib/logger';

interface RouteContext {
  params: {
    orgId: string;
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
    const { searchParams } = request.nextUrl;

    // Get pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    // Optional status filter
    const statusFilter = searchParams.get('status');
    const where: any = { orgId };

    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter;
    }

    // Get pending messages
    const [messages, total] = await Promise.all([
      prisma.messageQueue.findMany({
        where,
        select: {
          id: true,
          leadId: true,
          channel: true,
          status: true,
          deliveryStatus: true,
          scheduledFor: true,
          sentAt: true,
          failureReason: true,
          retryCount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit,
      }),
      prisma.messageQueue.count({ where }),
    ]);

    // Calculate summary stats
    const stats = await prisma.messageQueue.groupBy({
      by: ['status'],
      where: { orgId },
      _count: {
        id: true,
      },
    });

    const summary: Record<string, number> = {
      pending: 0,
      sending: 0,
      sent: 0,
      failed: 0,
      bounced: 0,
    };

    for (const stat of stats) {
      summary[stat.status] = stat._count.id;
    }

    // Get channel breakdown
    const channelStats = await prisma.messageQueue.groupBy({
      by: ['channel', 'status'],
      where: { orgId },
      _count: {
        id: true,
      },
    });

    const channelBreakdown: Record<string, Record<string, number>> = {
      email: { pending: 0, sending: 0, sent: 0, failed: 0, bounced: 0 },
      sms: { pending: 0, sending: 0, sent: 0, failed: 0, bounced: 0 },
      whatsapp: { pending: 0, sending: 0, sent: 0, failed: 0, bounced: 0 },
    };

    for (const stat of channelStats) {
      if (channelBreakdown[stat.channel]) {
        channelBreakdown[stat.channel][stat.status] = stat._count.id;
      }
    }

    logger.info('Queue status retrieved', {
      orgId,
      total,
      pending: summary.pending,
    });

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
      channelBreakdown,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to retrieve queue status', {
      orgId: context.orgId,
      error: errorMsg,
    });
    return NextResponse.json(
      { error: 'Failed to retrieve queue status' },
      { status: 500 }
    );
  }
};

export const GET = requireAuth(async (request, context) => {
  const orgId = context.orgId;
  const routeContext = { params: { orgId } };
  return handler(request, context, routeContext);
});
