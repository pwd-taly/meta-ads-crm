import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole, ApiContext } from '@/lib/api-middleware';
import {
  validateCustomFieldName,
  validateFieldConfig,
} from '@/lib/custom-fields/validation';
import logger from '@/lib/logger';

/**
 * Extract fieldId from the URL pathname.
 * Pattern: /organizations/[orgId]/custom-fields/[fieldId]
 * The fieldId is the last segment of the path.
 */
function extractFieldId(pathname: string): string {
  const segments = pathname.split('/');
  return segments[segments.length - 1] || '';
}

const handler = async (
  request: NextRequest,
  context: ApiContext
) => {
  const { orgId } = context;
  const fieldId = extractFieldId(request.nextUrl.pathname);

  // GET - Get single custom field
  if (request.method === 'GET') {
    try {
      const field = await prisma.customField.findFirst({
        where: {
          id: fieldId,
          orgId,
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

      if (!field) {
        return NextResponse.json(
          { error: 'Custom field not found' },
          { status: 404 }
        );
      }

      logger.info('Custom field retrieved', { orgId, fieldId });
      return NextResponse.json(field);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to retrieve custom field', {
        orgId,
        fieldId,
        error: errorMsg,
      });
      return NextResponse.json(
        { error: 'Failed to retrieve custom field' },
        { status: 500 }
      );
    }
  }

  // PUT - Update custom field
  if (request.method === 'PUT') {
    try {
      const body = await request.json();
      const { name, isRequired, config, sortOrder } = body;

      // Check field exists and belongs to org
      const existingField = await prisma.customField.findFirst({
        where: {
          id: fieldId,
          orgId,
        },
      });

      if (!existingField) {
        return NextResponse.json(
          { error: 'Custom field not found' },
          { status: 404 }
        );
      }

      // Build update data
      const updateData: any = {};

      if (name !== undefined) {
        // Validate new name
        if (!validateCustomFieldName(name)) {
          return NextResponse.json(
            {
              error:
                'Invalid field name. Must be 1-100 characters and not a reserved name',
            },
            { status: 400 }
          );
        }

        // Check uniqueness only if name is changing
        if (name !== existingField.name) {
          const duplicate = await prisma.customField.findUnique({
            where: {
              orgId_entityType_name: {
                orgId,
                entityType: existingField.entityType,
                name,
              },
            },
          });

          if (duplicate) {
            return NextResponse.json(
              {
                error: `A field with the name "${name}" already exists for this entity type`,
              },
              { status: 400 }
            );
          }
        }

        updateData.name = name;
      }

      if (isRequired !== undefined) {
        updateData.isRequired = isRequired;
      }

      if (config !== undefined) {
        // Validate config if provided
        if (!validateFieldConfig(existingField.type, config)) {
          return NextResponse.json(
            { error: 'Invalid field configuration for the specified type' },
            { status: 400 }
          );
        }
        updateData.config = config;
      }

      if (sortOrder !== undefined) {
        updateData.sortOrder = sortOrder;
      }

      // If no updates provided, return the existing field
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          {
            error: 'No fields provided to update',
          },
          { status: 400 }
        );
      }

      // Perform update
      const updatedField = await prisma.customField.update({
        where: {
          id: fieldId,
        },
        data: updateData,
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

      logger.info('Custom field updated', { orgId, fieldId });
      return NextResponse.json(updatedField);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to update custom field', {
        orgId,
        fieldId,
        error: errorMsg,
      });
      return NextResponse.json(
        { error: 'Failed to update custom field' },
        { status: 500 }
      );
    }
  }

  // DELETE - Delete custom field
  if (request.method === 'DELETE') {
    try {
      // Check field exists and belongs to org
      const field = await prisma.customField.findFirst({
        where: {
          id: fieldId,
          orgId,
        },
      });

      if (!field) {
        return NextResponse.json(
          { error: 'Custom field not found' },
          { status: 404 }
        );
      }

      // Delete the field
      await prisma.customField.delete({
        where: {
          id: fieldId,
        },
      });

      logger.info('Custom field deleted', { orgId, fieldId });
      return NextResponse.json({ success: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to delete custom field', {
        orgId,
        fieldId,
        error: errorMsg,
      });
      return NextResponse.json(
        { error: 'Failed to delete custom field' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
};

export const GET = requireAuth(handler);
export const PUT = requireRole('admin', handler);
export const DELETE = requireRole('admin', handler);
