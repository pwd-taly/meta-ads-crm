import { describe, it, expect } from 'vitest';
import { resolveTemplateVariables } from '@/lib/messaging/template-resolver';

describe('resolveTemplateVariables', () => {
  it('should resolve simple firstName variable', () => {
    const result = resolveTemplateVariables('Hi {{firstName}}!', {
      firstName: 'John',
    });
    expect(result).toBe('Hi John!');
  });

  it('should resolve multiple variables', () => {
    const result = resolveTemplateVariables(
      'Hello {{firstName}} {{lastName}}, welcome to {{orgName}}!',
      {
        firstName: 'John',
        lastName: 'Doe',
        orgName: 'Acme Inc',
      }
    );
    expect(result).toBe('Hello John Doe, welcome to Acme Inc!');
  });

  it('should resolve fullName from firstName and lastName', () => {
    const result = resolveTemplateVariables('Customer: {{fullName}}', {
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(result).toBe('Customer: John Doe');
  });

  it('should resolve campaign and ad variables', () => {
    const result = resolveTemplateVariables(
      'Campaign: {{campaignName}}, Ad: {{adName}}',
      {
        campaignName: 'Summer Sale',
        adName: 'Banner 1',
      }
    );
    expect(result).toBe('Campaign: Summer Sale, Ad: Banner 1');
  });

  it('should resolve organization name', () => {
    const result = resolveTemplateVariables('From {{orgName}}', {
      orgName: 'My Company',
    });
    expect(result).toBe('From My Company');
  });

  it('should resolve link URL', () => {
    const result = resolveTemplateVariables('Visit {{linkUrl}}', {
      linkUrl: 'https://example.com',
    });
    expect(result).toBe('Visit https://example.com');
  });

  it('should resolve date with YYYY-MM-DD format', () => {
    const result = resolveTemplateVariables('Date: {{date:YYYY-MM-DD}}', {});
    const dateRegex = /Date: \d{4}-\d{2}-\d{2}/;
    expect(result).toMatch(dateRegex);
  });

  it('should resolve time with HH:mm format', () => {
    const result = resolveTemplateVariables('Time: {{time:HH:mm}}', {});
    const timeRegex = /Time: \d{2}:\d{2}/;
    expect(result).toMatch(timeRegex);
  });

  it('should resolve date with custom format DD/MM/YYYY', () => {
    const result = resolveTemplateVariables('Date: {{date:DD/MM/YYYY}}', {});
    const dateRegex = /Date: \d{2}\/\d{2}\/\d{4}/;
    expect(result).toMatch(dateRegex);
  });

  it('should resolve time with custom format HH:mm:ss', () => {
    const result = resolveTemplateVariables('Time: {{time:HH:mm:ss}}', {});
    const timeRegex = /Time: \d{2}:\d{2}:\d{2}/;
    expect(result).toMatch(timeRegex);
  });

  it('should handle missing variables by leaving them unresolved', () => {
    const result = resolveTemplateVariables('Hi {{firstName}}, {{unknownVar}}', {
      firstName: 'John',
    });
    expect(result).toBe('Hi John, {{unknownVar}}');
  });

  it('should handle complex template with mixed variables', () => {
    const result = resolveTemplateVariables(
      'Hello {{firstName}} {{lastName}}, your booking for {{campaignName}} is confirmed. Visit {{linkUrl}}. Sent on {{date:YYYY-MM-DD}} at {{time:HH:mm}}.',
      {
        firstName: 'Jane',
        lastName: 'Smith',
        campaignName: 'Spring Event',
        linkUrl: 'https://event.example.com',
      }
    );
    expect(result).toContain('Hello Jane Smith');
    expect(result).toContain('Spring Event');
    expect(result).toContain('https://event.example.com');
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('should resolve fullName when only firstName is provided', () => {
    const result = resolveTemplateVariables('Name: {{fullName}}', {
      firstName: 'John',
    });
    expect(result).toBe('Name: John');
  });

  it('should resolve fullName when only lastName is provided', () => {
    const result = resolveTemplateVariables('Name: {{fullName}}', {
      lastName: 'Doe',
    });
    expect(result).toBe('Name: Doe');
  });

  it('should handle empty template', () => {
    const result = resolveTemplateVariables('', {
      firstName: 'John',
    });
    expect(result).toBe('');
  });

  it('should handle template with no variables', () => {
    const result = resolveTemplateVariables('Hello there!', {
      firstName: 'John',
    });
    expect(result).toBe('Hello there!');
  });

  it('should handle case sensitivity', () => {
    const result = resolveTemplateVariables('{{firstName}} {{FIRSTNAME}} {{FirstName}}', {
      firstName: 'John',
    });
    expect(result).toBe('John {{FIRSTNAME}} {{FirstName}}');
  });

  it('should handle repeated variables', () => {
    const result = resolveTemplateVariables('{{firstName}} and {{firstName}} and {{firstName}}', {
      firstName: 'John',
    });
    expect(result).toBe('John and John and John');
  });

  it('should handle variables with whitespace', () => {
    const result = resolveTemplateVariables('Hello {{ firstName }}!', {
      firstName: 'John',
    });
    // Should not resolve due to spaces inside brackets
    expect(result).toBe('Hello {{ firstName }}!');
  });

  it('should resolve empty string values', () => {
    const result = resolveTemplateVariables('Hello {{firstName}}!', {
      firstName: '',
    });
    expect(result).toBe('Hello !');
  });

  it('should handle special characters in values', () => {
    const result = resolveTemplateVariables('Company: {{orgName}}', {
      orgName: 'Smith & Co. (Est. 2020)',
    });
    expect(result).toBe('Company: Smith & Co. (Est. 2020)');
  });

  it('should handle numbers in values', () => {
    const result = resolveTemplateVariables('Booking #{{bookingId}}', {
      bookingId: '12345' as any,
    });
    expect(result).toBe('Booking #12345');
  });

  it('should preserve surrounding text', () => {
    const result = resolveTemplateVariables(
      'Dear {{firstName}},\n\nWelcome to {{orgName}}!\n\nBest regards',
      {
        firstName: 'John',
        orgName: 'Acme',
      }
    );
    expect(result).toContain('Dear John,');
    expect(result).toContain('Welcome to Acme!');
    expect(result).toContain('Best regards');
  });

  it('should resolve date with ISO format', () => {
    const result = resolveTemplateVariables('Date: {{date:YYYY-MM-DD}}', {});
    const dateRegex = /Date: \d{4}-\d{2}-\d{2}/;
    expect(result).toMatch(dateRegex);
    // Verify it's a valid date format
    const matches = result.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (matches) {
      const [, year, month, day] = matches;
      expect(parseInt(month)).toBeGreaterThanOrEqual(1);
      expect(parseInt(month)).toBeLessThanOrEqual(12);
      expect(parseInt(day)).toBeGreaterThanOrEqual(1);
      expect(parseInt(day)).toBeLessThanOrEqual(31);
    }
  });

  it('should resolve time with 24-hour format', () => {
    const result = resolveTemplateVariables('Time: {{time:HH:mm}}', {});
    const timeRegex = /Time: (\d{2}):(\d{2})/;
    expect(result).toMatch(timeRegex);
    const matches = result.match(/(\d{2}):(\d{2})/);
    if (matches) {
      const [, hours, minutes] = matches;
      expect(parseInt(hours)).toBeGreaterThanOrEqual(0);
      expect(parseInt(hours)).toBeLessThanOrEqual(23);
      expect(parseInt(minutes)).toBeGreaterThanOrEqual(0);
      expect(parseInt(minutes)).toBeLessThanOrEqual(59);
    }
  });
});
