import { describe, it, expect } from 'vitest';
import { evaluateCondition, evaluateConditions, Condition } from '@/lib/workflows/condition-evaluator';

describe('Condition Evaluator', () => {
  describe('Text field operators', () => {
    const entity = { email: 'test@example.com', name: 'John Doe' };

    describe('equals operator', () => {
      it('should match equal values (case-insensitive)', () => {
        const condition: Condition = {
          fieldId: 'email',
          operator: 'equals',
          value: 'TEST@EXAMPLE.COM',
        };
        expect(evaluateCondition(condition, entity)).toBe(true);
      });

      it('should not match different values', () => {
        const condition: Condition = {
          fieldId: 'email',
          operator: 'equals',
          value: 'other@example.com',
        };
        expect(evaluateCondition(condition, entity)).toBe(false);
      });

      it('should trim whitespace', () => {
        const condition: Condition = {
          fieldId: 'email',
          operator: 'equals',
          value: '  test@example.com  ',
        };
        expect(evaluateCondition(condition, entity)).toBe(true);
      });
    });

    describe('contains operator', () => {
      it('should find substring', () => {
        const condition: Condition = {
          fieldId: 'email',
          operator: 'contains',
          value: 'example',
        };
        expect(evaluateCondition(condition, entity)).toBe(true);
      });

      it('should be case-insensitive', () => {
        const condition: Condition = {
          fieldId: 'email',
          operator: 'contains',
          value: 'EXAMPLE',
        };
        expect(evaluateCondition(condition, entity)).toBe(true);
      });

      it('should not find missing substring', () => {
        const condition: Condition = {
          fieldId: 'email',
          operator: 'contains',
          value: 'notfound',
        };
        expect(evaluateCondition(condition, entity)).toBe(false);
      });
    });

    describe('starts_with operator', () => {
      it('should match prefix', () => {
        const condition: Condition = {
          fieldId: 'name',
          operator: 'starts_with',
          value: 'john',
        };
        expect(evaluateCondition(condition, entity)).toBe(true);
      });

      it('should be case-insensitive', () => {
        const condition: Condition = {
          fieldId: 'name',
          operator: 'starts_with',
          value: 'JOHN',
        };
        expect(evaluateCondition(condition, entity)).toBe(true);
      });

      it('should not match non-prefix', () => {
        const condition: Condition = {
          fieldId: 'name',
          operator: 'starts_with',
          value: 'doe',
        };
        expect(evaluateCondition(condition, entity)).toBe(false);
      });
    });

    describe('ends_with operator', () => {
      it('should match suffix', () => {
        const condition: Condition = {
          fieldId: 'name',
          operator: 'ends_with',
          value: 'doe',
        };
        expect(evaluateCondition(condition, entity)).toBe(true);
      });

      it('should be case-insensitive', () => {
        const condition: Condition = {
          fieldId: 'name',
          operator: 'ends_with',
          value: 'DOE',
        };
        expect(evaluateCondition(condition, entity)).toBe(true);
      });

      it('should not match non-suffix', () => {
        const condition: Condition = {
          fieldId: 'name',
          operator: 'ends_with',
          value: 'john',
        };
        expect(evaluateCondition(condition, entity)).toBe(false);
      });
    });

    describe('not_equals operator', () => {
      it('should match different values', () => {
        const condition: Condition = {
          fieldId: 'email',
          operator: 'not_equals',
          value: 'other@example.com',
        };
        expect(evaluateCondition(condition, entity)).toBe(true);
      });

      it('should not match same values', () => {
        const condition: Condition = {
          fieldId: 'email',
          operator: 'not_equals',
          value: 'test@example.com',
        };
        expect(evaluateCondition(condition, entity)).toBe(false);
      });
    });
  });

  describe('Number field operators', () => {
    const entity = { score: 75, budget: 1000 };

    describe('comparison operators', () => {
      it('should evaluate > correctly', () => {
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: '>', value: 50 },
            entity
          )
        ).toBe(true);
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: '>', value: 100 },
            entity
          )
        ).toBe(false);
      });

      it('should evaluate < correctly', () => {
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: '<', value: 100 },
            entity
          )
        ).toBe(true);
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: '<', value: 50 },
            entity
          )
        ).toBe(false);
      });

      it('should evaluate >= correctly', () => {
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: '>=', value: 75 },
            entity
          )
        ).toBe(true);
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: '>=', value: 76 },
            entity
          )
        ).toBe(false);
      });

      it('should evaluate <= correctly', () => {
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: '<=', value: 75 },
            entity
          )
        ).toBe(true);
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: '<=', value: 74 },
            entity
          )
        ).toBe(false);
      });

      it('should evaluate = correctly', () => {
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: '=', value: 75 },
            entity
          )
        ).toBe(true);
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: '=', value: 74 },
            entity
          )
        ).toBe(false);
      });
    });

    describe('between operator', () => {
      it('should check range inclusion', () => {
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: 'between', value: [50, 100] },
            entity
          )
        ).toBe(true);
      });

      it('should include boundaries', () => {
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: 'between', value: [75, 100] },
            entity
          )
        ).toBe(true);
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: 'between', value: [50, 75] },
            entity
          )
        ).toBe(true);
      });

      it('should exclude outside range', () => {
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: 'between', value: [80, 100] },
            entity
          )
        ).toBe(false);
      });

      it('should handle invalid range format', () => {
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: 'between', value: [50] },
            entity
          )
        ).toBe(false);
        expect(
          evaluateCondition(
            { fieldId: 'score', operator: 'between', value: 50 },
            entity
          )
        ).toBe(false);
      });
    });

    it('should handle string numbers', () => {
      const stringEntity = { value: '100' };
      expect(
        evaluateCondition(
          { fieldId: 'value', operator: '>', value: 50 },
          stringEntity
        )
      ).toBe(true);
    });

    it('should handle invalid numbers as 0', () => {
      const invalidEntity = { value: 'abc' };
      expect(
        evaluateCondition(
          { fieldId: 'value', operator: '>', value: 0 },
          invalidEntity
        )
      ).toBe(false);
    });
  });

  describe('Select field operators', () => {
    const entity = { status: 'active', tags: ['vip', 'active'] };

    describe('in operator', () => {
      it('should match single value in array', () => {
        expect(
          evaluateCondition(
            { fieldId: 'status', operator: 'in', value: ['active', 'pending'] },
            entity
          )
        ).toBe(true);
      });

      it('should not match value not in array', () => {
        expect(
          evaluateCondition(
            { fieldId: 'status', operator: 'in', value: ['inactive', 'pending'] },
            entity
          )
        ).toBe(false);
      });

      it('should handle array field values', () => {
        expect(
          evaluateCondition(
            { fieldId: 'tags', operator: 'in', value: ['vip', 'standard'] },
            entity
          )
        ).toBe(true);
      });

      it('should handle invalid array value', () => {
        expect(
          evaluateCondition(
            { fieldId: 'status', operator: 'in', value: 'not-an-array' },
            entity
          )
        ).toBe(false);
      });
    });

    describe('equals operator for select', () => {
      it('should match equal values', () => {
        expect(
          evaluateCondition(
            { fieldId: 'status', operator: 'equals', value: 'active' },
            entity
          )
        ).toBe(true);
      });

      it('should not match different values', () => {
        expect(
          evaluateCondition(
            { fieldId: 'status', operator: 'equals', value: 'inactive' },
            entity
          )
        ).toBe(false);
      });
    });

    describe('not_equals operator for select', () => {
      it('should match different values', () => {
        expect(
          evaluateCondition(
            { fieldId: 'status', operator: 'not_equals', value: 'inactive' },
            entity
          )
        ).toBe(true);
      });

      it('should not match same values', () => {
        expect(
          evaluateCondition(
            { fieldId: 'status', operator: 'not_equals', value: 'active' },
            entity
          )
        ).toBe(false);
      });
    });
  });

  describe('Checkbox field operators', () => {
    const entity = { isVerified: true, isBlocked: false };

    describe('is_true operator', () => {
      it('should match true value', () => {
        expect(
          evaluateCondition(
            { fieldId: 'isVerified', operator: 'is_true', value: null },
            entity
          )
        ).toBe(true);
      });

      it('should not match false value', () => {
        expect(
          evaluateCondition(
            { fieldId: 'isBlocked', operator: 'is_true', value: null },
            entity
          )
        ).toBe(false);
      });

      it('should handle truthy values', () => {
        expect(
          evaluateCondition(
            { fieldId: 'isVerified', operator: 'is_true', value: null },
            { isVerified: 1 }
          )
        ).toBe(true);
      });
    });

    describe('is_false operator', () => {
      it('should match false value', () => {
        expect(
          evaluateCondition(
            { fieldId: 'isBlocked', operator: 'is_false', value: null },
            entity
          )
        ).toBe(true);
      });

      it('should not match true value', () => {
        expect(
          evaluateCondition(
            { fieldId: 'isVerified', operator: 'is_false', value: null },
            entity
          )
        ).toBe(false);
      });

      it('should handle falsy values', () => {
        expect(
          evaluateCondition(
            { fieldId: 'isBlocked', operator: 'is_false', value: null },
            { isBlocked: 0 }
          )
        ).toBe(true);
      });
    });
  });

  describe('Date field operators', () => {
    const entity = {
      createdAt: new Date('2024-01-15'),
      dueDate: '2024-12-31',
    };

    describe('before operator', () => {
      it('should match earlier date', () => {
        expect(
          evaluateCondition(
            { fieldId: 'createdAt', operator: 'before', value: '2024-02-01' },
            entity
          )
        ).toBe(true);
      });

      it('should not match same or later date', () => {
        expect(
          evaluateCondition(
            { fieldId: 'createdAt', operator: 'before', value: '2024-01-15' },
            entity
          )
        ).toBe(false);
      });
    });

    describe('after operator', () => {
      it('should match later date', () => {
        expect(
          evaluateCondition(
            { fieldId: 'createdAt', operator: 'after', value: '2024-01-01' },
            entity
          )
        ).toBe(true);
      });

      it('should not match same or earlier date', () => {
        expect(
          evaluateCondition(
            { fieldId: 'createdAt', operator: 'after', value: '2024-01-15' },
            entity
          )
        ).toBe(false);
      });
    });

    describe('equals operator for dates', () => {
      it('should match same date', () => {
        expect(
          evaluateCondition(
            { fieldId: 'createdAt', operator: 'equals', value: '2024-01-15' },
            entity
          )
        ).toBe(true);
      });

      it('should not match different date', () => {
        expect(
          evaluateCondition(
            { fieldId: 'createdAt', operator: 'equals', value: '2024-01-16' },
            entity
          )
        ).toBe(false);
      });
    });

    it('should handle string dates', () => {
      expect(
        evaluateCondition(
          { fieldId: 'dueDate', operator: 'after', value: '2024-01-01' },
          entity
        )
      ).toBe(true);
    });

    it('should handle leap years', () => {
      const leapEntity = { date: new Date('2024-02-29') };
      expect(
        evaluateCondition(
          { fieldId: 'date', operator: 'after', value: '2024-02-28' },
          leapEntity
        )
      ).toBe(true);
    });

    it('should handle invalid dates gracefully', () => {
      const invalidEntity = { date: 'not-a-date' };
      expect(
        evaluateCondition(
          { fieldId: 'date', operator: 'before', value: '2024-01-15' },
          invalidEntity
        )
      ).toBe(false);
    });
  });

  describe('Custom fields (from customValues JSON)', () => {
    const entity = {
      name: 'John',
      customValues: {
        customField1: 'custom value',
        customScore: 85,
      },
    };

    it('should evaluate custom text field', () => {
      expect(
        evaluateCondition(
          { fieldId: 'customField1', operator: 'equals', value: 'custom value' },
          entity
        )
      ).toBe(true);
    });

    it('should evaluate custom number field', () => {
      expect(
        evaluateCondition(
          { fieldId: 'customScore', operator: '>', value: 80 },
          entity
        )
      ).toBe(true);
    });

    it('should handle missing custom field', () => {
      expect(
        evaluateCondition(
          { fieldId: 'nonExistent', operator: 'equals', value: 'value' },
          entity
        )
      ).toBe(false);
    });
  });

  describe('AND/OR condition logic', () => {
    const entity = { status: 'active', score: 75, email: 'test@example.com' };

    describe('AND logic', () => {
      it('should return true when all conditions match', () => {
        const conditions: Condition[] = [
          { fieldId: 'status', operator: 'equals', value: 'active' },
          { fieldId: 'score', operator: '>', value: 50 },
        ];
        expect(evaluateConditions(conditions, 'AND', entity)).toBe(true);
      });

      it('should return false when any condition fails', () => {
        const conditions: Condition[] = [
          { fieldId: 'status', operator: 'equals', value: 'active' },
          { fieldId: 'score', operator: '>', value: 100 },
        ];
        expect(evaluateConditions(conditions, 'AND', entity)).toBe(false);
      });

      it('should default to AND', () => {
        const conditions: Condition[] = [
          { fieldId: 'status', operator: 'equals', value: 'active' },
          { fieldId: 'score', operator: '>', value: 50 },
        ];
        expect(evaluateConditions(conditions, 'INVALID', entity)).toBe(true);
      });
    });

    describe('OR logic', () => {
      it('should return true when any condition matches', () => {
        const conditions: Condition[] = [
          { fieldId: 'status', operator: 'equals', value: 'inactive' },
          { fieldId: 'score', operator: '>', value: 50 },
        ];
        expect(evaluateConditions(conditions, 'OR', entity)).toBe(true);
      });

      it('should return false when all conditions fail', () => {
        const conditions: Condition[] = [
          { fieldId: 'status', operator: 'equals', value: 'inactive' },
          { fieldId: 'score', operator: '>', value: 100 },
        ];
        expect(evaluateConditions(conditions, 'OR', entity)).toBe(false);
      });

      it('should be case-insensitive', () => {
        const conditions: Condition[] = [
          { fieldId: 'status', operator: 'equals', value: 'active' },
        ];
        expect(evaluateConditions(conditions, 'or', entity)).toBe(true);
      });
    });

    it('should handle empty conditions array', () => {
      expect(evaluateConditions([], 'AND', entity)).toBe(true);
      expect(evaluateConditions([], 'OR', entity)).toBe(true);
    });

    it('should handle multiple conditions', () => {
      const conditions: Condition[] = [
        { fieldId: 'status', operator: 'equals', value: 'active' },
        { fieldId: 'score', operator: '>', value: 50 },
        { fieldId: 'email', operator: 'contains', value: 'example' },
      ];
      expect(evaluateConditions(conditions, 'AND', entity)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle null entity', () => {
      const condition: Condition = { fieldId: 'field', operator: 'equals', value: 'value' };
      expect(evaluateCondition(condition, null)).toBe(false);
    });

    it('should handle undefined entity', () => {
      const condition: Condition = { fieldId: 'field', operator: 'equals', value: 'value' };
      expect(evaluateCondition(condition, undefined)).toBe(false);
    });

    it('should handle missing fieldId', () => {
      const condition: Condition = { fieldId: '', operator: 'equals', value: 'value' };
      expect(evaluateCondition(condition, { field: 'value' })).toBe(false);
    });

    it('should handle null field value', () => {
      const condition: Condition = { fieldId: 'field', operator: 'equals', value: 'value' };
      expect(evaluateCondition(condition, { field: null })).toBe(false);
    });

    it('should handle undefined field value', () => {
      const condition: Condition = { fieldId: 'field', operator: 'equals', value: 'value' };
      expect(evaluateCondition(condition, {})).toBe(false);
    });

    it('should handle infinity in numbers', () => {
      const condition: Condition = { fieldId: 'value', operator: '>', value: Infinity };
      expect(evaluateCondition(condition, { value: 1000000 })).toBe(false);
      expect(evaluateCondition(condition, { value: Infinity })).toBe(false);
    });

    it('should handle null in customValues', () => {
      const entity = { customValues: null };
      const condition: Condition = { fieldId: 'field', operator: 'equals', value: 'value' };
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it('should handle unknown operator', () => {
      const condition: Condition = { fieldId: 'field', operator: 'unknown_op', value: 'value' };
      expect(evaluateCondition(condition, { field: 'value' })).toBe(false);
    });

    it('should handle condition with null', () => {
      expect(evaluateCondition(null as any, { field: 'value' })).toBe(false);
    });

    it('should handle null conditions array', () => {
      expect(evaluateConditions(null as any, 'AND', { field: 'value' })).toBe(true);
    });

    it('should handle undefined conditions array', () => {
      expect(evaluateConditions(undefined as any, 'AND', { field: 'value' })).toBe(true);
    });

    it('should handle empty string field value', () => {
      const condition: Condition = { fieldId: 'field', operator: 'equals', value: '' };
      expect(evaluateCondition(condition, { field: '' })).toBe(true);
      expect(evaluateCondition(condition, { field: '  ' })).toBe(true);
    });
  });
});
