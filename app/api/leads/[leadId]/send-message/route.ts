import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, ApiContext } from '@/lib/api-middleware';
import logger from '@/lib/logger';
import { MessageQueueService } from '@/lib/messaging/message-queue-service';
import { TemplateResolver } from '@/lib/messaging/template-resolver';

interface RouteContext {
  params: {
    leadId: string;
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
    const { leadId } = routeContext.params;
    const body = await request.json();
    const {
      channel,
      templateId,
      customMessage,
      scheduledFor,
      variables,
    } = body;

    // Validation
    if (!channel || !['email', 'sms', 'whatsapp'].includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel. Must be email, sms, or whatsapp' },
        { status: 400 }
      );
    }

    // Get lead
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, orgId },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Validate recipient has required contact info
    if (channel === 'email' && !lead.email) {
      return NextResponse.json(
        { error: 'Lead does not have an email address' },
        { status: 400 }
      );
    }

    if ((channel === 'sms' || channel === 'whatsapp') && !lead.phone) {
      return NextResponse.json(
        { error: `Lead does not have a phone number` },
        { status: 400 }
      );
    }

    let messageBody = customMessage || '';
    let messageSubject = '';

    // If using template, resolve it
    if (templateId) {
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

      // Resolve template variables
      const [firstName = '', ...rest] = (lead.name || '').split(' ');
      const lastName = rest.join(' ');
      const leadVariables = {
        firstName,
        lastName,
        email: lead.email || '',
        phone: lead.phone || '',
        ...variables,
      };

      const resolved = templateResolver.resolve(template.body, leadVariables);
      if (!resolved.isValid) {
        return NextResponse.json(
          {
            error: 'Template resolution failed',
            missing: resolved.missing,
          },
          { status: 400 }
        );
      }

      messageBody = resolved.text;
      messageSubject = template.subject || '';
    }

    if (!messageBody) {
      return NextResponse.json(
        { error: 'Message body cannot be empty' },
        { status: 400 }
      );
    }

    // Schedule validation
    const sendTime = scheduledFor ? new Date(scheduledFor) : undefined;
    if (sendTime && sendTime < new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }

    // Enqueue the message
    const message = await messageQueueService.enqueue({
      orgId,
      leadId,
      channel,
      recipientEmail: lead.email || undefined,
      recipientPhone: lead.phone || undefined,
      templateId: templateId || undefined,
      subject: messageSubject || undefined,
      body: messageBody,
      scheduledFor: sendTime,
    });

    logger.info('Message enqueued for lead', {
      orgId,
      leadId,
      channel,
      messageId: message.id,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to enqueue message', {
      orgId: context.orgId,
      error: errorMsg,
    });
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
};

export const POST = requireAuth(async (request, context) => {
  const leadId = request.nextUrl.pathname.split('/')[3];
  const routeContext = { params: { leadId } };
  return handler(request, context, routeContext);
});
