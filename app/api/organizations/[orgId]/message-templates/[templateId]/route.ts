import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole, ApiContext } from '@/lib/api-middleware';
import logger from '@/lib/logger';

interface RouteContext {
  params: {
    orgId: string;
    templateId: string;
  };
}

const handler = async (
  request: NextRequest,
  context: ApiContext,
  routeContext: RouteContext
) => {
  const { orgId } = context;
  const { templateId } = routeContext.params;

  // GET - Retrieve single template
  if (request.method === 'GET') {
    try {
      const template = await prisma.messageTemplate.findFirst({
        where: {
          id: templateId,
          orgId,
        },
      });

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      logger.info('Template retrieved', { orgId, templateId });
      return NextResponse.json(template);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to retrieve template', {
        orgId,
        templateId,
        error: errorMsg,
      });
      return NextResponse.json(
        { error: 'Failed to retrieve template' },
        { status: 500 }
      );
    }
  }

  // PUT - Update template
  if (request.method === 'PUT') {
    try {
      // Check ownership
      const existing = await prisma.messageTemplate.findFirst({
        where: { id: templateId, orgId },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      const body = await request.json();
      const { name, channel, subject, body: bodyText, variables } = body;

      // Validate channel if provided
      if (channel && !['email', 'sms', 'whatsapp'].includes(channel)) {
        return NextResponse.json(
          { error: 'Invalid channel. Must be email, sms, or whatsapp' },
          { status: 400 }
        );
      }

      // Validate email requires subject
      const updateChannel = channel || existing.channel;
      if (updateChannel === 'email' && !subject && !existing.subject) {
        return NextResponse.json(
          { error: 'Email templates require a subject' },
          { status: 400 }
        );
      }

      const updated = await prisma.messageTemplate.update({
        where: { id: templateId },
        data: {
          ...(name && { name }),
          ...(channel && { channel }),
          ...(subject !== undefined && { subject }),
          ...(bodyText && { body: bodyText }),
          ...(variables !== undefined && { variables }),
        },
      });

      logger.info('Template updated', { orgId, templateId });
      return NextResponse.json(updated);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to update template', {
        orgId,
        templateId,
        error: errorMsg,
      });
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      );
    }
  }

  // DELETE - Remove template
  if (request.method === 'DELETE') {
    try {
      const template = await prisma.messageTemplate.findFirst({
        where: { id: templateId, orgId },
      });

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      await prisma.messageTemplate.delete({
        where: { id: templateId },
      });

      logger.info('Template deleted', { orgId, templateId });
      return NextResponse.json({ success: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to delete template', {
        orgId,
        templateId,
        error: errorMsg,
      });
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
};

export const GET = requireAuth(async (request, context) => {
  const routeContext = {
    params: {
      orgId: context.orgId,
      templateId: (request.nextUrl.pathname.split('/').pop() || ''),
    },
  };
  return handler(request, context, routeContext);
});

export const PUT = requireRole('admin', async (request, context) => {
  const routeContext = {
    params: {
      orgId: context.orgId,
      templateId: (request.nextUrl.pathname.split('/').pop() || ''),
    },
  };
  return handler(request, context, routeContext);
});

export const DELETE = requireRole('admin', async (request, context) => {
  const routeContext = {
    params: {
      orgId: context.orgId,
      templateId: (request.nextUrl.pathname.split('/').pop() || ''),
    },
  };
  return handler(request, context, routeContext);
});
