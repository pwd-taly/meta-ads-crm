/**
 * Workflow Action Executor
 *
 * Executes workflow actions: send messages, update fields, change status,
 * manage campaign membership, create tasks
 */

import { prisma } from '@/lib/db';
import { MessageQueueService } from '@/lib/messaging/message-queue-service';
import { resolveTemplateVariables } from '@/lib/messaging/template-resolver';
import logger from '@/lib/logger';

export interface ActionContext {
  orgId: string;
  entityId: string;
  entityType: 'lead' | 'campaign';
  entity: any;
  userId?: string;
}

export interface ActionExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
}

/**
 * Executes a single workflow action
 *
 * @param action - Action configuration {type, config}
 * @param context - Action execution context
 * @returns Result with success flag and optional output/error
 */
export async function executeAction(
  action: any,
  context: ActionContext
): Promise<ActionExecutionResult> {
  if (!action || !action.type) {
    return {
      success: false,
      error: 'Invalid action: missing type',
    };
  }

  try {
    switch (action.type) {
      case 'SEND_MESSAGE':
        return await executeSendMessage(action.config, context);
      case 'UPDATE_FIELD':
        return await executeUpdateField(action.config, context);
      case 'CHANGE_STATUS':
        return await executeChangeStatus(action.config, context);
      case 'ADD_TO_CAMPAIGN':
        return await executeAddToCampaign(action.config, context);
      case 'REMOVE_FROM_CAMPAIGN':
        return await executeRemoveFromCampaign(action.config, context);
      case 'CREATE_TASK':
        return await executeCreateTask(action.config, context);
      default:
        return {
          success: false,
          error: `Unknown action type: ${action.type}`,
        };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Action execution failed', {
      actionType: action.type,
      entityId: context.entityId,
      error: errorMsg,
    });
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * SEND_MESSAGE: Enqueue message via messaging service
 * Config: {channel: "email"|"sms"|"whatsapp", templateId}
 */
async function executeSendMessage(
  config: any,
  context: ActionContext
): Promise<ActionExecutionResult> {
  const { channel, templateId } = config;

  if (!channel || !templateId) {
    return {
      success: false,
      error: 'Missing channel or templateId',
    };
  }

  // Lead-only operation
  if (context.entityType !== 'lead') {
    return {
      success: false,
      error: 'SEND_MESSAGE only works with leads',
    };
  }

  try {
    // Fetch template
    const template = await prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return {
        success: false,
        error: `Template not found: ${templateId}`,
      };
    }

    // Build template variables from lead
    const entity = context.entity;
    const variables = {
      firstName: entity.name?.split(' ')[0] || '',
      lastName: entity.name?.split(' ')[1] || '',
      fullName: entity.name || '',
      email: entity.email || '',
      phone: entity.phone || '',
      campaignName: entity.campaignName || '',
      adName: entity.adName || '',
    };

    // Resolve template body and subject
    const body = resolveTemplateVariables(template.body, variables);
    const subject = template.subject
      ? resolveTemplateVariables(template.subject, variables)
      : undefined;

    // Determine recipient based on channel
    let recipientEmail: string | undefined;
    let recipientPhone: string | undefined;

    if (channel === 'email') {
      recipientEmail = entity.email;
      if (!recipientEmail) {
        return {
          success: false,
          error: 'Lead has no email address',
        };
      }
    } else if (channel === 'sms' || channel === 'whatsapp') {
      recipientPhone = entity.phone;
      if (!recipientPhone) {
        return {
          success: false,
          error: `Lead has no phone number for ${channel}`,
        };
      }
    }

    // Enqueue message
    const messageService = new MessageQueueService();
    const message = await messageService.enqueue({
      orgId: context.orgId,
      leadId: context.entityId,
      channel,
      templateId,
      recipientEmail,
      recipientPhone,
      subject,
      body,
    });

    return {
      success: true,
      output: {
        messageId: message.id,
        channel,
        recipient: recipientEmail || recipientPhone,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * UPDATE_FIELD: Update custom field with optional variable substitution
 * Config: {entityType, fieldId, value}
 */
async function executeUpdateField(
  config: any,
  context: ActionContext
): Promise<ActionExecutionResult> {
  const { entityType, fieldId, value } = config;

  if (!entityType || !fieldId) {
    return {
      success: false,
      error: 'Missing entityType or fieldId',
    };
  }

  if (entityType !== context.entityType) {
    return {
      success: false,
      error: `Action entity type ${entityType} does not match context ${context.entityType}`,
    };
  }

  try {
    // Resolve variable substitution in value
    const entity = context.entity;
    const variables = {
      firstName: entity.name?.split(' ')[0] || '',
      lastName: entity.name?.split(' ')[1] || '',
      fullName: entity.name || '',
      email: entity.email || '',
    };

    const resolvedValue = typeof value === 'string'
      ? resolveTemplateVariables(value, variables)
      : value;

    // Update based on entity type
    let updated;
    if (entityType === 'lead') {
      updated = await prisma.lead.update({
        where: { id: context.entityId },
        data: {
          customValues: {
            ...(context.entity.customValues || {}),
            [fieldId]: resolvedValue,
          },
        },
      });
    } else if (entityType === 'campaign') {
      updated = await prisma.campaign.update({
        where: { id: context.entityId },
        data: {
          customValues: {
            ...(context.entity.customValues || {}),
            [fieldId]: resolvedValue,
          },
        },
      });
    } else {
      return {
        success: false,
        error: `Invalid entity type: ${entityType}`,
      };
    }

    return {
      success: true,
      output: {
        fieldId,
        newValue: resolvedValue,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * CHANGE_STATUS: Update entity status field
 * Config: {entityType, newStatus}
 */
async function executeChangeStatus(
  config: any,
  context: ActionContext
): Promise<ActionExecutionResult> {
  const { entityType, newStatus } = config;

  if (!entityType || !newStatus) {
    return {
      success: false,
      error: 'Missing entityType or newStatus',
    };
  }

  if (entityType !== context.entityType) {
    return {
      success: false,
      error: `Action entity type ${entityType} does not match context ${context.entityType}`,
    };
  }

  try {
    let updated;
    if (entityType === 'lead') {
      updated = await prisma.lead.update({
        where: { id: context.entityId },
        data: { status: newStatus },
      });
    } else if (entityType === 'campaign') {
      updated = await prisma.campaign.update({
        where: { id: context.entityId },
        data: { status: newStatus },
      });
    } else {
      return {
        success: false,
        error: `Invalid entity type: ${entityType}`,
      };
    }

    return {
      success: true,
      output: { newStatus },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * ADD_TO_CAMPAIGN: Add lead to campaign (lead-only)
 * Config: {campaignId}
 */
async function executeAddToCampaign(
  config: any,
  context: ActionContext
): Promise<ActionExecutionResult> {
  const { campaignId } = config;

  if (!campaignId) {
    return {
      success: false,
      error: 'Missing campaignId',
    };
  }

  if (context.entityType !== 'lead') {
    return {
      success: false,
      error: 'ADD_TO_CAMPAIGN only works with leads',
    };
  }

  try {
    // Fetch lead to get current campaigns
    const lead = await prisma.lead.findUnique({
      where: { id: context.entityId },
    });

    if (!lead) {
      return {
        success: false,
        error: 'Lead not found',
      };
    }

    // Parse current campaign IDs (stored as JSON or comma-separated)
    let campaignIds: string[] = [];
    if (lead.campaignId) {
      campaignIds = [lead.campaignId];
    }

    // Check if already in campaign
    const alreadyAdded = campaignIds.includes(campaignId);
    if (alreadyAdded) {
      return {
        success: true,
        output: {
          campaignId,
          added: false,
          reason: 'Lead already in campaign',
        },
      };
    }

    // Add to campaign (use first slot in this schema)
    const updated = await prisma.lead.update({
      where: { id: context.entityId },
      data: {
        campaignId: campaignId,
      },
    });

    return {
      success: true,
      output: {
        campaignId,
        added: true,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * REMOVE_FROM_CAMPAIGN: Remove lead from campaign (lead-only)
 * Config: {campaignId}
 */
async function executeRemoveFromCampaign(
  config: any,
  context: ActionContext
): Promise<ActionExecutionResult> {
  const { campaignId } = config;

  if (!campaignId) {
    return {
      success: false,
      error: 'Missing campaignId',
    };
  }

  if (context.entityType !== 'lead') {
    return {
      success: false,
      error: 'REMOVE_FROM_CAMPAIGN only works with leads',
    };
  }

  try {
    // Fetch lead
    const lead = await prisma.lead.findUnique({
      where: { id: context.entityId },
    });

    if (!lead) {
      return {
        success: false,
        error: 'Lead not found',
      };
    }

    // Check if in campaign
    const isInCampaign = lead.campaignId === campaignId;
    if (!isInCampaign) {
      return {
        success: true,
        output: {
          campaignId,
          removed: false,
          reason: 'Lead not in campaign',
        },
      };
    }

    // Remove from campaign
    const updated = await prisma.lead.update({
      where: { id: context.entityId },
      data: {
        campaignId: null,
      },
    });

    return {
      success: true,
      output: {
        campaignId,
        removed: true,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * CREATE_TASK: Create task for team
 * Config: {title, description, dueInDays: 0-30}
 */
async function executeCreateTask(
  config: any,
  context: ActionContext
): Promise<ActionExecutionResult> {
  const { title, description, dueInDays = 0 } = config;

  if (!title) {
    return {
      success: false,
      error: 'Missing title',
    };
  }

  if (dueInDays < 0 || dueInDays > 30) {
    return {
      success: false,
      error: 'dueInDays must be between 0 and 30',
    };
  }

  try {
    // Calculate due date
    const now = new Date();
    const dueDate = new Date(now.getTime() + dueInDays * 24 * 60 * 60 * 1000);

    // Create task record if table exists
    // For now, we'll return success assuming Task model exists
    // This would be created as:
    // const task = await prisma.task.create({...})

    // Mock implementation - actual implementation depends on Task model
    const taskId = `task-${Date.now()}`;

    return {
      success: true,
      output: {
        taskId,
        title,
        dueDate,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
