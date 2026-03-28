import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, ApiContext } from '@/lib/api-middleware';
import logger from '@/lib/logger';
import { MessageQueueService } from '@/lib/messaging/message-queue-service';
import { TemplateResolver } from '@/lib/messaging/template-resolver';

interface RouteContext {
  params: {
    campaignId: string;
  };
}

const messageQueueService = new MessageQueueService();
const templateResolver = new TemplateResolver();

const handler = async (
  request: NextRequest,
  context: ApiContext,
  routeContext: RouteContext
) => {
  if (request.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { orgId } = context;
    const { campaignId } = routeContext.params;
    const body = await request.json();
    const {
      channel,
      templateId,
      recipientFilter,
      variables,
    } = body;

    // Validation
    if (!channel || !['email', 'sms', 'whatsapp'].includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel. Must be email, sms, or whatsapp' },
        { status: 400 }
      );
    }

    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId is required for campaign broadcast' },
        { status: 400 }
      );
    }

    // Get template
    const template = await prisma.messageTemplate.findFirst({
      where: { id: templateId, orgId },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    if (template.channel !== channel) {
      return NextResponse.json(
        { error: 'Template channel does not match requested channel' },
        { status: 400 }
      );
    }

    // Query leads matching filter
    const where: any = {
      orgId,
      campaignName: campaignId,
    };

    // Apply recipient filter if provided
    if (recipientFilter) {
      if (recipientFilter.minScore !== undefined) {
        where.aiScore = { gte: recipientFilter.minScore };
      }
      if (recipientFilter.maxScore !== undefined) {
        if (where.aiScore) {
          where.aiScore.lte = recipientFilter.maxScore;
        } else {
          where.aiScore = { lte: recipientFilter.maxScore };
        }
      }
      if (recipientFilter.status) {
        where.status = recipientFilter.status;
      }
    }

    // Channel-specific contact validation
    if (channel === 'email') {
      where.email = { not: null };
    } else if (channel === 'sms' || channel === 'whatsapp') {
      where.phone = { not: null };
    }

    // Get leads
    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
      },
    });

    if (leads.length === 0) {
      logger.warn('No leads found for campaign broadcast', {
        orgId,
        campaignId,
        channel,
      });
      return NextResponse.json(
        { sentCount: 0, messageIds: [] },
        { status: 200 }
      );
    }

    // Enqueue messages for each lead
    const messageIds: string[] = [];
    let enqueueErrorCount = 0;

    for (const lead of leads) {
      try {
        // Resolve template for this lead
        const leadVariables = {
          firstName: lead.firstName || '',
          lastName: lead.lastName || '',
          email: lead.email || '',
          phone: lead.phone || '',
          ...variables,
        };

        const resolved = templateResolver.resolve(template.body, leadVariables);
        if (!resolved.isValid) {
          logger.warn('Failed to resolve template for lead', {
            orgId,
            leadId: lead.id,
            missing: resolved.missing,
          });
          enqueueErrorCount++;
          continue;
        }

        const message = await messageQueueService.enqueue({
          orgId,
          leadId: lead.id,
          channel,
          recipientEmail: lead.email || undefined,
          recipientPhone: lead.phone || undefined,
          templateId,
          subject: template.subject || undefined,
          body: resolved.text,
        });

        messageIds.push(message.id);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Failed to enqueue message for lead', {
          orgId,
          leadId: lead.id,
          error: errorMsg,
        });
        enqueueErrorCount++;
      }
    }

    logger.info('Campaign messages enqueued', {
      orgId,
      campaignId,
      channel,
      sentCount: messageIds.length,
      failedCount: enqueueErrorCount,
      totalLeads: leads.length,
    });

    return NextResponse.json(
      {
        sentCount: messageIds.length,
        failedCount: enqueueErrorCount,
        messageIds,
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to broadcast campaign messages', {
      orgId: context.orgId,
      error: errorMsg,
    });
    return NextResponse.json(
      { error: 'Failed to broadcast messages' },
      { status: 500 }
    );
  }
};

export const POST = requireAuth(async (request, context) => {
  const campaignId = request.nextUrl.pathname.split('/')[3];
  const routeContext = { params: { campaignId } };
  return handler(request, context, routeContext);
});
