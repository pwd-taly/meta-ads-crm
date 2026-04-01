import { format } from 'date-fns';

interface TemplateVariables {
  [key: string]: string | number | undefined;
}

/**
 * Resolves template variables in a template string.
 *
 * Supported variables:
 * - {{firstName}} - First name
 * - {{lastName}} - Last name
 * - {{fullName}} - First and last name combined
 * - {{campaignName}} - Campaign name
 * - {{adName}} - Ad name
 * - {{orgName}} - Organization name
 * - {{linkUrl}} - URL link
 * - {{date:FORMAT}} - Current date in specified format (e.g., {{date:YYYY-MM-DD}})
 * - {{time:FORMAT}} - Current time in specified format (e.g., {{time:HH:mm}})
 *
 * Unresolved variables are left as-is in the template.
 *
 * @param template - The template string with variables
 * @param variables - Object containing variable values
 * @returns The resolved template string
 */
export function resolveTemplateVariables(
  template: string,
  variables: TemplateVariables
): string {
  if (!template) return template;

  // First, resolve date and time format variables (they don't need input)
  let result = template;

  // Handle {{date:FORMAT}} patterns
  result = result.replace(/\{\{date:([^}]+)\}\}/g, (match, format_pattern) => {
    try {
      const now = new Date();
      // Convert common date format patterns to date-fns format
      const dateFormatPattern = convertDatePattern(format_pattern as string);
      return format(now, dateFormatPattern);
    } catch (error) {
      // If format is invalid, return the original pattern
      return match;
    }
  });

  // Handle {{time:FORMAT}} patterns
  result = result.replace(/\{\{time:([^}]+)\}\}/g, (match, format_pattern) => {
    try {
      const now = new Date();
      // Convert common time format patterns to date-fns format
      const timeFormatPattern = convertTimePattern(format_pattern as string);
      return format(now, timeFormatPattern);
    } catch (error) {
      // If format is invalid, return the original pattern
      return match;
    }
  });

  // Resolve simple variables
  result = result.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (match, variable) => {
    if (variable === 'fullName') {
      // Special handling for fullName - combine firstName and lastName
      const firstName = variables.firstName || '';
      const lastName = variables.lastName || '';
      const combined = [firstName, lastName].filter(Boolean).join(' ');
      return combined || match;
    }

    const value = variables[variable];
    if (value !== undefined && value !== null) {
      return String(value);
    }
    // Return unresolved variable as-is
    return match;
  });

  return result;
}

/**
 * Converts common date format patterns to date-fns format
 * YYYY-MM-DD -> yyyy-MM-dd
 * DD/MM/YYYY -> dd/MM/yyyy
 */
function convertDatePattern(pattern: string): string {
  return pattern
    .replace(/YYYY/g, 'yyyy')
    .replace(/DD/g, 'dd');
}

/**
 * Converts common time format patterns to date-fns format
 * HH:mm -> HH:mm (already correct)
 * HH:mm:ss -> HH:mm:ss (already correct)
 */
function convertTimePattern(pattern: string): string {
  // date-fns uses uppercase HH for hours, lowercase mm for minutes, ss for seconds
  // Most common patterns already match, just ensure consistency
  return pattern
    .replace(/hh/g, 'HH'); // Convert lowercase hh to uppercase HH if needed
}


/**
 * Result of a template resolution attempt.
 */
export interface TemplateResolveResult {
  isValid: boolean;
  text: string;
  missing: string[];
}

/**
 * Class wrapper around resolveTemplateVariables for use in services and routes.
 */
export class TemplateResolver {
  resolve(template: string, variables: TemplateVariables): TemplateResolveResult {
    const text = resolveTemplateVariables(template, variables);
    // Detect any variables that were left unresolved (still contain {{ }})
    const missingMatches = text.match(/\{\{[a-zA-Z_][a-zA-Z0-9_:]*\}\}/g) || [];
    const missing = [...new Set(missingMatches)];
    return { isValid: missing.length === 0, text, missing };
  }
}
