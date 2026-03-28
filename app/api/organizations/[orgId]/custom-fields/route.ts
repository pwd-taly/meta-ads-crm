import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole, ApiContext } from '@/lib/api-middleware';
import {
  validateCustomFieldName,
  validateFieldType,
  validateFieldConfig,
} from '@/lib/custom-fields/validation';
import logger from '@/lib/logger';

const handler = async (request: NextRequest, context: ApiContext) => {
  const { orgId } = context;
  const { searchParams } = request.nextUrl;

  // GET - List custom fields
  if (request.method === 'GET') {
    try {
      const entityType = searchParams.get('entityType');
      const where: any = { orgId };

      if (entityType && ['lead', 'campaign'].includes(entityType)) {
        where.entityType = entityType;
      }

      const fields = await prisma.customField.findMany({
        where,
        select: {
          id: true,
          entityType: true,
          name: true,
          type: true,
          isRequired: true,
          sortOrder: true,
          config: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      logger.info('Custom fields listed', {
        orgId,
        count: fields.length,
        entityType: entityType || 'all',
      });

      return NextResponse.json(fields);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to list custom fields', { orgId, error: errorMsg });
      return NextResponse.json(
        { error: 'Failed to list custom fields' },
        { status: 500 }
      );
    }
  }

  // POST - Create custom field
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const { entityType, name, type, isRequired = false, config } = body;

      // Validate required fields
      if (!entityType || !name || !type) {
        logger.warn('Custom field validation failed', {
          orgId,
          missing: { entityType: !entityType, name: !name, type: !type },
        });
        return NextResponse.json(
          { error: 'Missing required fields: entityType, name, type' },
          { status: 400 }
        );
      }

      // Validate entityType
      if (!['lead', 'campaign'].includes(entityType)) {
        return NextResponse.json(
          { error: 'Invalid entityType. Must be "lead" or "campaign"' },
          { status: 400 }
        );
      }

      // Validate field name
      if (!validateCustomFieldName(name)) {
        return NextResponse.json(
          {
            error:
              'Invalid field name. Must be 1-100 characters and not a reserved name',
          },
          { status: 400 }
        );
      }

      // Validate field type
      if (!validateFieldType(type)) {
        return NextResponse.json(
          {
            error:
              'Invalid field type. Must be one of: text, number, email, select, date, checkbox, textarea',
          },
          { status: 400 }
        );
      }

      // Validate field config if provided
      if (config !== undefined && !validateFieldConfig(type, config)) {
        return NextResponse.json(
          { error: 'Invalid field configuration for the specified type' },
          { status: 400 }
        );
      }

      // Check uniqueness (name must be unique per org and entityType)
      const existing = await prisma.customField.findUnique({
        where: {
          orgId_entityType_name: {
            orgId,
            entityType,
            name,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          {
            error: `A field with the name "${name}" already exists for this entity type`,
          },
          { status: 400 }
        );
      }

      // Calculate sortOrder (max existing + 1)
      const maxSortOrder = await prisma.customField.findFirst({
        where: { orgId, entityType },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });

      const sortOrder = (maxSortOrder?.sortOrder ?? -1) + 1;

      // Create the custom field
      const field = await prisma.customField.create({
        data: {
          orgId,
          entityType,
          name,
          type,
          isRequired,
          sortOrder,
          config: config || null,
          createdBy: context.userId,
        },
        select: {
          id: true,
          entityType: true,
          name: true,
          type: true,
          isRequired: true,
          sortOrder: true,
          config: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info('Custom field created', {
        orgId,
        fieldId: field.id,
        entityType,
        name,
      });

      return NextResponse.json(field, { status: 201 });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to create custom field', { orgId, error: errorMsg });
      return NextResponse.json(
        { error: 'Failed to create custom field' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
};

export const GET = requireAuth(handler);
export const POST = requireRole('admin', handler);
