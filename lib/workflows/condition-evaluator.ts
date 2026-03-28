/**
 * Workflow Condition Evaluator
 *
 * Evaluates workflow conditions against entity data.
 * Supports: text, number, select, checkbox, date fields
 * Logic operators: AND, OR
 */

export interface Condition {
  fieldId: string;
  operator: string;
  value: any;
}

/**
 * Evaluates a single condition against entity data
 *
 * @param condition - Condition configuration
 * @param entity - Entity object (Lead or Campaign)
 * @returns true if condition is met, false otherwise
 */
export function evaluateCondition(condition: Condition, entity: any): boolean {
  if (!condition || !condition.fieldId) {
    return false;
  }

  // Get field value from entity
  const fieldValue = getFieldValue(entity, condition.fieldId);

  // Missing required fields return false
  if (fieldValue === undefined || fieldValue === null) {
    return false;
  }

  return evaluateOperator(fieldValue, condition.operator, condition.value);
}

/**
 * Evaluates multiple conditions with AND/OR logic
 *
 * @param conditions - Array of conditions
 * @param logic - "AND" or "OR"
 * @param entity - Entity object to evaluate against
 * @returns true if conditions are met, false otherwise
 */
export function evaluateConditions(
  conditions: Condition[],
  logic: string,
  entity: any
): boolean {
  // Empty conditions always return true
  if (!conditions || conditions.length === 0) {
    return true;
  }

  const normalizedLogic = logic?.toUpperCase() || 'AND';

  if (normalizedLogic === 'OR') {
    // OR: at least one condition must be true
    return conditions.some(condition => evaluateCondition(condition, entity));
  }

  // AND (default): all conditions must be true
  return conditions.every(condition => evaluateCondition(condition, entity));
}

/**
 * Gets the field value from an entity (Lead or Campaign)
 * Handles both standard fields and customValues JSON
 */
function getFieldValue(entity: any, fieldId: string): any {
  if (!entity) {
    return undefined;
  }

  // Check standard fields first
  if (fieldId in entity) {
    return entity[fieldId];
  }

  // Check customValues (JSON field)
  if (entity.customValues && typeof entity.customValues === 'object') {
    return entity.customValues[fieldId];
  }

  return undefined;
}

/**
 * Evaluates an operator condition
 */
function evaluateOperator(fieldValue: any, operator: string, targetValue: any): boolean {
  // Check if this looks like a date comparison
  const isLikelyDate = (val: any) => {
    if (val instanceof Date) return true;
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return true;
    if (typeof val === 'string' && !isNaN(Date.parse(val))) {
      // Check if it's a valid date string but not a plain number
      if (!/^\d+$/.test(val)) return true;
    }
    return false;
  };

  // Use date comparison for date-like values
  if ((operator === 'before' || operator === 'after' || operator === 'equals') && isLikelyDate(fieldValue)) {
    if (operator === 'before') {
      return compareDate(fieldValue, targetValue) < 0;
    }
    if (operator === 'after') {
      return compareDate(fieldValue, targetValue) > 0;
    }
    if (operator === 'equals') {
      return compareDate(fieldValue, targetValue) === 0;
    }
  }

  switch (operator) {
    // Text operators
    case 'equals':
      return normalizeString(fieldValue) === normalizeString(targetValue);
    case 'contains':
      return normalizeString(fieldValue).includes(normalizeString(targetValue));
    case 'starts_with':
      return normalizeString(fieldValue).startsWith(normalizeString(targetValue));
    case 'ends_with':
      return normalizeString(fieldValue).endsWith(normalizeString(targetValue));
    case 'not_equals':
      return normalizeString(fieldValue) !== normalizeString(targetValue);

    // Number operators
    case '>':
      return toNumber(fieldValue) > toNumber(targetValue);
    case '<':
      return toNumber(fieldValue) < toNumber(targetValue);
    case '>=':
      return toNumber(fieldValue) >= toNumber(targetValue);
    case '<=':
      return toNumber(fieldValue) <= toNumber(targetValue);
    case '=':
      return toNumber(fieldValue) === toNumber(targetValue);
    case 'between':
      return evaluateBetween(toNumber(fieldValue), targetValue);

    // Select operators
    case 'in':
      return evaluateIn(fieldValue, targetValue);

    // Checkbox operators
    case 'is_true':
      return Boolean(fieldValue) === true;
    case 'is_false':
      return Boolean(fieldValue) === false;

    // Date operators
    case 'before':
      return compareDate(fieldValue, targetValue) < 0;
    case 'after':
      return compareDate(fieldValue, targetValue) > 0;

    default:
      return false;
  }
}

/**
 * Normalizes string for case-insensitive comparison
 */
function normalizeString(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).toLowerCase().trim();
}

/**
 * Converts value to number, returns NaN if not possible
 */
function toNumber(value: any): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Evaluates between operator for range checking
 */
function evaluateBetween(value: number, range: any): boolean {
  if (!Array.isArray(range) || range.length !== 2) {
    return false;
  }

  const min = toNumber(range[0]);
  const max = toNumber(range[1]);

  return value >= min && value <= max;
}

/**
 * Evaluates in operator for checking if value is in array
 */
function evaluateIn(fieldValue: any, targetArray: any): boolean {
  if (!Array.isArray(targetArray)) {
    return false;
  }

  // If fieldValue is array, check for intersection
  if (Array.isArray(fieldValue)) {
    return fieldValue.some(item => targetArray.includes(item));
  }

  // Otherwise check if single value is in array
  return targetArray.includes(fieldValue);
}

/**
 * Compares two date values
 * Returns: -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
function compareDate(date1: any, date2: any): number {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();

  if (isNaN(d1) || isNaN(d2)) {
    return 0;
  }

  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}
