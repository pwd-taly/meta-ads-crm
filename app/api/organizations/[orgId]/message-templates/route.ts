import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole, ApiContext } from '@/lib/api-middleware';
import logger from '@/lib/logger';

const handler = async (request: NextRequest, context: ApiContext) => {
  const { orgId } = context;
  const { searchParams } = request.nextUrl;

  // GET - List templates
  if (request.method === 'GET') {
    try {
      const channel = searchParams.get('channel');
      const where: any = { orgId };

      if (channel && channel !== 'all') {
        where.channel = channel;
      }

      const templates = await prisma.messageTemplate.findMany({
        where,
        select: {
          id: true,
          name: true,
          channel: true,
          subject: true,
          body: true,
          variables: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      logger.info('Templates listed', { orgId, count: templates.length });
      return NextResponse.json(templates);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to list templates', { orgId, error: errorMsg });
      return NextResponse.json(
        { error: 'Failed to list templates' },
        { status: 500 }
      );
    }
  }

  // POST - Create template
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const { name, channel, subject, body: bodyText, variables } = body;

      // Validation
      if (!name || !channel || !bodyText) {
        logger.warn('Template validation failed', {
          orgId,
          missing: { name: !name, channel: !channel, body: !bodyText },
        });
        return NextResponse.json(
          { error: 'Missing required fields: name, channel, body' },
          { status: 400 }
        );
      }

      if (!['email', 'sms', 'whatsapp'].includes(channel)) {
        return NextResponse.json(
          { error: 'Invalid channel. Must be email, sms, or whatsapp' },
          { status: 400 }
        );
      }

      // Email requires subject
      if (channel === 'email' && !subject) {
        return NextResponse.json(
          { error: 'Email templates require a subject' },
          { status: 400 }
        );
      }

      const template = await prisma.messageTemplate.create({
        data: {
          orgId,
          name,
          channel,
          subject: channel === 'email' ? subject : null,
          body: bodyText,
          variables,
          createdBy: context.userId,
        },
      });

      logger.info('Template created', {
        orgId,
        templateId: template.id,
        channel,
      });

      return NextResponse.json(template, { status: 201 });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to create template', { orgId, error: errorMsg });
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
};

export const GET = requireAuth(handler);
export const POST = requireRole('admin', handler);
