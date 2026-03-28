/**
 * Custom Field Validation Service
 *
 * Provides validation functions for custom fields including:
 * - Field name validation (reserved names, length, format)
 * - Field type validation
 * - Field configuration validation (type-specific constraints)
 * - Field value validation (type-specific and config-specific constraints)
 */

// Reserved field names that cannot be used for custom fields
const RESERVED_FIELD_NAMES = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "orgId",
  "leadId",
  "campaignId",
  "status",
  "aiScore",
  "scoreReason",
  "lastScoredAt",
  "customValues",
  "firstName",
  "lastName",
  "email",
  "phone",
]);

// Valid custom field types
const VALID_FIELD_TYPES = new Set([
  "text",
  "number",
  "email",
  "select",
  "date",
  "checkbox",
  "textarea",
]);

// Email validation regex - basic validation for email format
// Allows alphanumeric, dots, underscores, hyphens, percent, and plus signs in local part
const EMAIL_REGEX = /^[a-zA-Z0-9._+%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Helper function to validate email format more strictly
 * Checks for consecutive dots which are invalid in email addresses
 */
function isValidEmail(email: string): boolean {
  // Basic regex check
  if (!EMAIL_REGEX.test(email)) {
    return false;
  }
  // Check for consecutive dots
  if (email.includes("..")) {
    return false;
  }
  return true;
}

/**
 * Validates a custom field name
 *
 * @param name - The field name to validate
 * @returns true if the name is valid, false otherwise
 *
 * Valid names must:
 * - Not be empty or whitespace-only
 * - Not exceed 100 characters
 * - Not be a reserved field name
 */
export function validateCustomFieldName(name: string): boolean {
  // Check for empty or whitespace-only string
  if (!name || name.trim().length === 0) {
    return false;
  }

  // Check length constraint
  if (name.length > 100) {
    return false;
  }

  // Check against reserved names (exact match, case-sensitive)
  if (RESERVED_FIELD_NAMES.has(name)) {
    return false;
  }

  return true;
}

/**
 * Validates a custom field type
 *
 * @param type - The field type to validate
 * @returns true if the type is valid, false otherwise
 *
 * Valid types: "text", "number", "email", "select", "date", "checkbox", "textarea"
 */
export function validateFieldType(type: string): boolean {
  return VALID_FIELD_TYPES.has(type);
}

/**
 * Validates field configuration based on the field type
 *
 * @param type - The field type
 * @param config - The field configuration object
 * @returns true if the configuration is valid, false otherwise
 *
 * Configuration rules:
 * - "select" type: must have config.options (non-empty array)
 * - "number" type: if min and max are provided, min must be <= max
 * - Other types: return true if valid
 */
export function validateFieldConfig(type: string, config: any): boolean {
  // Select type requires options array with at least one option
  if (type === "select") {
    if (!config || !Array.isArray(config.options) || config.options.length === 0) {
      return false;
    }
  }

  // Number type: validate min/max constraints if provided
  if (type === "number") {
    if (config) {
      // If both min and max are provided, min must be <= max
      if (
        config.min !== undefined &&
        config.max !== undefined &&
        typeof config.min === "number" &&
        typeof config.max === "number"
      ) {
        if (config.min > config.max) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Validates a custom field value based on its type and optional configuration
 *
 * @param type - The field type
 * @param value - The value to validate
 * @param config - Optional field configuration (required for "select" type)
 * @returns true if the value is valid, false otherwise
 *
 * Validation rules:
 * - null/undefined: allowed (optional fields)
 * - "text": must be string, max 255 chars
 * - "number": must be a valid number (not NaN)
 * - "email": must match email regex
 * - "date": must be valid YYYY-MM-DD format and represent a valid date
 * - "checkbox": must be boolean
 * - "textarea": must be string, max 10000 chars
 * - "select": must be one of config.options
 */
export function validateCustomFieldValue(type: string, value: any, config?: any): boolean {
  // Allow null/undefined for optional fields
  if (value === null || value === undefined) {
    return true;
  }

  switch (type) {
    case "text":
      return typeof value === "string" && value.length <= 255;

    case "number":
      return typeof value === "number" && !isNaN(value) && isFinite(value);

    case "email":
      return typeof value === "string" && isValidEmail(value);

    case "date":
      return isValidDate(value);

    case "checkbox":
      return typeof value === "boolean";

    case "textarea":
      return typeof value === "string" && value.length <= 10000;

    case "select":
      if (!config || !Array.isArray(config.options)) {
        return false;
      }
      return config.options.includes(value);

    default:
      return false;
  }
}

/**
 * Helper function to validate date format and actual date validity
 *
 * @param value - The value to validate as a date
 * @returns true if the value is a valid YYYY-MM-DD date, false otherwise
 */
function isValidDate(value: any): boolean {
  // Must be a string
  if (typeof value !== "string") {
    return false;
  }

  // Must match YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    return false;
  }

  // Parse the date and verify it's a valid date
  const date = new Date(value + "T00:00:00Z");
  if (isNaN(date.getTime())) {
    return false;
  }

  // Verify the date components match what was provided (handles invalid dates like 2024-02-30)
  const [year, month, day] = value.split("-").map(Number);
  const dateYear = date.getUTCFullYear();
  const dateMonth = date.getUTCMonth() + 1;
  const dateDay = date.getUTCDate();

  return year === dateYear && month === dateMonth && day === dateDay;
}
