/**
 * Workflow Trigger Evaluator
 *
 * Evaluates whether a trigger matches the current context.
 * Supports: ENTITY_CREATED, FIELD_CHANGED, STATUS_CHANGED, SCORE_THRESHOLD, TIME_BASED
 */

export interface TriggerContext {
  triggerType: string;
  entityType?: string;
  fieldId?: string;
  oldValue?: any;
  newValue?: any;
  oldStatus?: string;
  newStatus?: string;
  oldScore?: number;
  newScore?: number;
}

/**
 * Evaluates whether a trigger matches the given context
 *
 * @param trigger - Trigger configuration object with type and config
 * @param context - Trigger context from entity change event
 * @returns true if trigger matches context, false otherwise
 */
export function evaluateTrigger(trigger: any, context: TriggerContext): boolean {
  if (!trigger || !trigger.type) {
    return false;
  }

  const { type, config = {} } = trigger;

  switch (type) {
    case 'ENTITY_CREATED':
      return evaluateEntityCreated(config, context);
    case 'FIELD_CHANGED':
      return evaluateFieldChanged(config, context);
    case 'STATUS_CHANGED':
      return evaluateStatusChanged(config, context);
    case 'SCORE_THRESHOLD':
      return evaluateScoreThreshold(config, context);
    case 'TIME_BASED':
      return evaluateTimeBased(config, context);
    default:
      return false;
  }
}

/**
 * ENTITY_CREATED: Fires when lead/campaign created
 * Config: {entityType: "lead"|"campaign"}
 */
function evaluateEntityCreated(config: any, context: TriggerContext): boolean {
  if (context.triggerType !== 'ENTITY_CREATED') {
    return false;
  }

  // Match entity type if specified
  if (config.entityType) {
    return context.entityType === config.entityType;
  }

  return true;
}

/**
 * FIELD_CHANGED: Fires when specific field changes
 * Config: {entityType, fieldId, fromValue?}
 */
function evaluateFieldChanged(config: any, context: TriggerContext): boolean {
  if (context.triggerType !== 'FIELD_CHANGED') {
    return false;
  }

  // Check field ID matches
  if (!config.fieldId || context.fieldId !== config.fieldId) {
    return false;
  }

  // Check entity type if specified
  if (config.entityType && context.entityType !== config.entityType) {
    return false;
  }

  // Check fromValue (old value) if specified
  if (config.fromValue !== undefined) {
    if (context.oldValue !== config.fromValue) {
      return false;
    }
  }

  return true;
}

/**
 * STATUS_CHANGED: Fires when status field changes to target
 * Config: {entityType, toStatus}
 */
function evaluateStatusChanged(config: any, context: TriggerContext): boolean {
  if (context.triggerType !== 'STATUS_CHANGED') {
    return false;
  }

  // Check entity type if specified
  if (config.entityType && context.entityType !== config.entityType) {
    return false;
  }

  // Check target status
  if (!config.toStatus || context.newStatus !== config.toStatus) {
    return false;
  }

  return true;
}

/**
 * SCORE_THRESHOLD: Fires when lead score crosses threshold
 * Config: {operator: ">"|"<"|">="|"<="|"=", value: number}
 *
 * Only triggers on CROSSING, not if already above/below threshold
 */
function evaluateScoreThreshold(config: any, context: TriggerContext): boolean {
  if (context.triggerType !== 'SCORE_THRESHOLD') {
    return false;
  }

  const { operator, value } = config;

  if (!operator || value === undefined || value === null) {
    return false;
  }

  const oldScore = context.oldScore ?? 0;
  const newScore = context.newScore ?? 0;

  // Check if crossing the threshold
  const oldMeetsThreshold = meetsThreshold(oldScore, operator, value);
  const newMeetsThreshold = meetsThreshold(newScore, operator, value);

  // Only trigger on crossing (state change), not if already meeting threshold
  return !oldMeetsThreshold && newMeetsThreshold;
}

/**
 * Helper to check if a value meets a threshold condition
 */
function meetsThreshold(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case '>':
      return value > threshold;
    case '<':
      return value < threshold;
    case '>=':
      return value >= threshold;
    case '<=':
      return value <= threshold;
    case '=':
      return value === threshold;
    default:
      return false;
  }
}

/**
 * TIME_BASED: Always returns true (evaluated by job scheduler)
 * Config: {frequency: "daily"|"weekly"|"monthly", time: "HH:mm"}
 */
function evaluateTimeBased(config: any, context: TriggerContext): boolean {
  if (context.triggerType !== 'TIME_BASED') {
    return false;
  }

  // TIME_BASED triggers are always "match" here
  // The actual scheduling is handled by the job scheduler
  return true;
}
