import { describe, it, expect } from 'vitest';
import { evaluateTrigger, TriggerContext } from '@/lib/workflows/trigger-evaluator';

describe('Trigger Evaluator', () => {
  describe('ENTITY_CREATED trigger', () => {
    const trigger = {
      type: 'ENTITY_CREATED',
      config: { entityType: 'lead' },
    };

    it('should match when entity type matches', () => {
      const context: TriggerContext = {
        triggerType: 'ENTITY_CREATED',
        entityType: 'lead',
      };
      expect(evaluateTrigger(trigger, context)).toBe(true);
    });

    it('should not match when entity type differs', () => {
      const context: TriggerContext = {
        triggerType: 'ENTITY_CREATED',
        entityType: 'campaign',
      };
      expect(evaluateTrigger(trigger, context)).toBe(false);
    });

    it('should not match when trigger type differs', () => {
      const context: TriggerContext = {
        triggerType: 'FIELD_CHANGED',
        entityType: 'lead',
      };
      expect(evaluateTrigger(trigger, context)).toBe(false);
    });

    it('should match any entity type when entityType not specified', () => {
      const triggerAny = {
        type: 'ENTITY_CREATED',
        config: {},
      };
      const contextLead: TriggerContext = {
        triggerType: 'ENTITY_CREATED',
        entityType: 'lead',
      };
      const contextCampaign: TriggerContext = {
        triggerType: 'ENTITY_CREATED',
        entityType: 'campaign',
      };
      expect(evaluateTrigger(triggerAny, contextLead)).toBe(true);
      expect(evaluateTrigger(triggerAny, contextCampaign)).toBe(true);
    });

    it('should match campaign entity type', () => {
      const campaignTrigger = {
        type: 'ENTITY_CREATED',
        config: { entityType: 'campaign' },
      };
      const context: TriggerContext = {
        triggerType: 'ENTITY_CREATED',
        entityType: 'campaign',
      };
      expect(evaluateTrigger(campaignTrigger, context)).toBe(true);
    });
  });

  describe('FIELD_CHANGED trigger', () => {
    const trigger = {
      type: 'FIELD_CHANGED',
      config: { entityType: 'lead', fieldId: 'email' },
    };

    it('should match when field changes', () => {
      const context: TriggerContext = {
        triggerType: 'FIELD_CHANGED',
        entityType: 'lead',
        fieldId: 'email',
        oldValue: 'old@example.com',
        newValue: 'new@example.com',
      };
      expect(evaluateTrigger(trigger, context)).toBe(true);
    });

    it('should not match when field ID differs', () => {
      const context: TriggerContext = {
        triggerType: 'FIELD_CHANGED',
        entityType: 'lead',
        fieldId: 'phone',
        oldValue: 'old',
        newValue: 'new',
      };
      expect(evaluateTrigger(trigger, context)).toBe(false);
    });

    it('should not match when entity type differs', () => {
      const context: TriggerContext = {
        triggerType: 'FIELD_CHANGED',
        entityType: 'campaign',
        fieldId: 'email',
        oldValue: 'old',
        newValue: 'new',
      };
      expect(evaluateTrigger(trigger, context)).toBe(false);
    });

    it('should match with specific fromValue requirement', () => {
      const triggerWithFrom = {
        type: 'FIELD_CHANGED',
        config: { entityType: 'lead', fieldId: 'status', fromValue: 'new' },
      };
      const contextMatching: TriggerContext = {
        triggerType: 'FIELD_CHANGED',
        entityType: 'lead',
        fieldId: 'status',
        oldValue: 'new',
        newValue: 'contacted',
      };
      const contextNotMatching: TriggerContext = {
        triggerType: 'FIELD_CHANGED',
        entityType: 'lead',
        fieldId: 'status',
        oldValue: 'contacted',
        newValue: 'booked',
      };
      expect(evaluateTrigger(triggerWithFrom, contextMatching)).toBe(true);
      expect(evaluateTrigger(triggerWithFrom, contextNotMatching)).toBe(false);
    });

    it('should not match when fieldId is not specified in trigger', () => {
      const triggerNoField = {
        type: 'FIELD_CHANGED',
        config: { entityType: 'lead' },
      };
      const context: TriggerContext = {
        triggerType: 'FIELD_CHANGED',
        entityType: 'lead',
        fieldId: 'email',
        oldValue: 'old',
        newValue: 'new',
      };
      expect(evaluateTrigger(triggerNoField, context)).toBe(false);
    });

    it('should match without entity type requirement', () => {
      const triggerNoEntity = {
        type: 'FIELD_CHANGED',
        config: { fieldId: 'email' },
      };
      const contextLead: TriggerContext = {
        triggerType: 'FIELD_CHANGED',
        entityType: 'lead',
        fieldId: 'email',
        oldValue: 'old',
        newValue: 'new',
      };
      const contextCampaign: TriggerContext = {
        triggerType: 'FIELD_CHANGED',
        entityType: 'campaign',
        fieldId: 'email',
        oldValue: 'old',
        newValue: 'new',
      };
      expect(evaluateTrigger(triggerNoEntity, contextLead)).toBe(true);
      expect(evaluateTrigger(triggerNoEntity, contextCampaign)).toBe(true);
    });
  });

  describe('STATUS_CHANGED trigger', () => {
    const trigger = {
      type: 'STATUS_CHANGED',
      config: { entityType: 'lead', toStatus: 'booked' },
    };

    it('should match when status changes to target', () => {
      const context: TriggerContext = {
        triggerType: 'STATUS_CHANGED',
        entityType: 'lead',
        oldStatus: 'contacted',
        newStatus: 'booked',
      };
      expect(evaluateTrigger(trigger, context)).toBe(true);
    });

    it('should not match when status differs from target', () => {
      const context: TriggerContext = {
        triggerType: 'STATUS_CHANGED',
        entityType: 'lead',
        oldStatus: 'contacted',
        newStatus: 'closed',
      };
      expect(evaluateTrigger(trigger, context)).toBe(false);
    });

    it('should not match when entity type differs', () => {
      const context: TriggerContext = {
        triggerType: 'STATUS_CHANGED',
        entityType: 'campaign',
        oldStatus: 'active',
        newStatus: 'booked',
      };
      expect(evaluateTrigger(trigger, context)).toBe(false);
    });

    it('should match campaign status change', () => {
      const campaignTrigger = {
        type: 'STATUS_CHANGED',
        config: { entityType: 'campaign', toStatus: 'paused' },
      };
      const context: TriggerContext = {
        triggerType: 'STATUS_CHANGED',
        entityType: 'campaign',
        oldStatus: 'active',
        newStatus: 'paused',
      };
      expect(evaluateTrigger(campaignTrigger, context)).toBe(true);
    });

    it('should not match when toStatus is not specified', () => {
      const triggerNoTarget = {
        type: 'STATUS_CHANGED',
        config: { entityType: 'lead' },
      };
      const context: TriggerContext = {
        triggerType: 'STATUS_CHANGED',
        entityType: 'lead',
        oldStatus: 'contacted',
        newStatus: 'booked',
      };
      expect(evaluateTrigger(triggerNoTarget, context)).toBe(false);
    });

    it('should match without entity type requirement', () => {
      const triggerNoEntity = {
        type: 'STATUS_CHANGED',
        config: { toStatus: 'booked' },
      };
      const contextLead: TriggerContext = {
        triggerType: 'STATUS_CHANGED',
        entityType: 'lead',
        oldStatus: 'contacted',
        newStatus: 'booked',
      };
      expect(evaluateTrigger(triggerNoEntity, contextLead)).toBe(true);
    });
  });

  describe('SCORE_THRESHOLD trigger', () => {
    it('should trigger when crossing threshold upward with >', () => {
      const trigger = {
        type: 'SCORE_THRESHOLD',
        config: { operator: '>', value: 50 },
      };
      const context: TriggerContext = {
        triggerType: 'SCORE_THRESHOLD',
        oldScore: 40,
        newScore: 60,
      };
      expect(evaluateTrigger(trigger, context)).toBe(true);
    });

    it('should not trigger when already above threshold', () => {
      const trigger = {
        type: 'SCORE_THRESHOLD',
        config: { operator: '>', value: 50 },
      };
      const context: TriggerContext = {
        triggerType: 'SCORE_THRESHOLD',
        oldScore: 60,
        newScore: 70,
      };
      expect(evaluateTrigger(trigger, context)).toBe(false);
    });

    it('should not trigger when below threshold', () => {
      const trigger = {
        type: 'SCORE_THRESHOLD',
        config: { operator: '>', value: 50 },
      };
      const context: TriggerContext = {
        triggerType: 'SCORE_THRESHOLD',
        oldScore: 30,
        newScore: 40,
      };
      expect(evaluateTrigger(trigger, context)).toBe(false);
    });

    it('should trigger when crossing threshold downward with <', () => {
      const trigger = {
        type: 'SCORE_THRESHOLD',
        config: { operator: '<', value: 30 },
      };
      const context: TriggerContext = {
        triggerType: 'SCORE_THRESHOLD',
        oldScore: 40,
        newScore: 20,
      };
      expect(evaluateTrigger(trigger, context)).toBe(true);
    });

    it('should trigger with >= operator', () => {
      const trigger = {
        type: 'SCORE_THRESHOLD',
        config: { operator: '>=', value: 50 },
      };
      const context: TriggerContext = {
        triggerType: 'SCORE_THRESHOLD',
        oldScore: 40,
        newScore: 50,
      };
      expect(evaluateTrigger(trigger, context)).toBe(true);
    });

    it('should trigger with <= operator', () => {
      const trigger = {
        type: 'SCORE_THRESHOLD',
        config: { operator: '<=', value: 30 },
      };
      const context: TriggerContext = {
        triggerType: 'SCORE_THRESHOLD',
        oldScore: 40,
        newScore: 30,
      };
      expect(evaluateTrigger(trigger, context)).toBe(true);
    });

    it('should trigger with = operator', () => {
      const trigger = {
        type: 'SCORE_THRESHOLD',
        config: { operator: '=', value: 50 },
      };
      const context: TriggerContext = {
        triggerType: 'SCORE_THRESHOLD',
        oldScore: 40,
        newScore: 50,
      };
      expect(evaluateTrigger(trigger, context)).toBe(true);
    });

    it('should not trigger with = operator when not equal', () => {
      const trigger = {
        type: 'SCORE_THRESHOLD',
        config: { operator: '=', value: 50 },
      };
      const context: TriggerContext = {
        triggerType: 'SCORE_THRESHOLD',
        oldScore: 40,
        newScore: 49,
      };
      expect(evaluateTrigger(trigger, context)).toBe(false);
    });

    it('should handle undefined scores as 0', () => {
      const trigger = {
        type: 'SCORE_THRESHOLD',
        config: { operator: '>', value: 0 },
      };
      const context: TriggerContext = {
        triggerType: 'SCORE_THRESHOLD',
        oldScore: undefined,
        newScore: 10,
      };
      expect(evaluateTrigger(trigger, context)).toBe(true);
    });

    it('should not trigger with invalid operator', () => {
      const trigger = {
        type: 'SCORE_THRESHOLD',
        config: { operator: 'invalid', value: 50 },
      };
      const context: TriggerContext = {
        triggerType: 'SCORE_THRESHOLD',
        oldScore: 40,
        newScore: 60,
      };
      expect(evaluateTrigger(trigger, context)).toBe(false);
    });
  });

  describe('TIME_BASED trigger', () => {
    const trigger = {
      type: 'TIME_BASED',
      config: { frequency: 'daily', time: '09:00' },
    };

    it('should always match for TIME_BASED trigger type', () => {
      const context: TriggerContext = {
        triggerType: 'TIME_BASED',
      };
      expect(evaluateTrigger(trigger, context)).toBe(true);
    });

    it('should not match when trigger type is different', () => {
      const context: TriggerContext = {
        triggerType: 'ENTITY_CREATED',
      };
      expect(evaluateTrigger(trigger, context)).toBe(false);
    });

    it('should match different frequencies', () => {
      const daily = {
        type: 'TIME_BASED',
        config: { frequency: 'daily' },
      };
      const weekly = {
        type: 'TIME_BASED',
        config: { frequency: 'weekly' },
      };
      const monthly = {
        type: 'TIME_BASED',
        config: { frequency: 'monthly' },
      };
      const context: TriggerContext = { triggerType: 'TIME_BASED' };

      expect(evaluateTrigger(daily, context)).toBe(true);
      expect(evaluateTrigger(weekly, context)).toBe(true);
      expect(evaluateTrigger(monthly, context)).toBe(true);
    });
  });

  describe('Invalid triggers', () => {
    it('should return false for undefined trigger', () => {
      const context: TriggerContext = { triggerType: 'ENTITY_CREATED' };
      expect(evaluateTrigger(undefined, context)).toBe(false);
    });

    it('should return false for null trigger', () => {
      const context: TriggerContext = { triggerType: 'ENTITY_CREATED' };
      expect(evaluateTrigger(null, context)).toBe(false);
    });

    it('should return false for trigger without type', () => {
      const trigger = { config: {} };
      const context: TriggerContext = { triggerType: 'ENTITY_CREATED' };
      expect(evaluateTrigger(trigger, context)).toBe(false);
    });

    it('should return false for unknown trigger type', () => {
      const trigger = {
        type: 'UNKNOWN_TYPE',
        config: {},
      };
      const context: TriggerContext = { triggerType: 'UNKNOWN_TYPE' };
      expect(evaluateTrigger(trigger, context)).toBe(false);
    });

    it('should handle missing config gracefully', () => {
      const trigger = { type: 'ENTITY_CREATED' };
      const context: TriggerContext = {
        triggerType: 'ENTITY_CREATED',
        entityType: 'lead',
      };
      expect(evaluateTrigger(trigger, context)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle null context values', () => {
      const trigger = {
        type: 'FIELD_CHANGED',
        config: { fieldId: 'email' },
      };
      const context: TriggerContext = {
        triggerType: 'FIELD_CHANGED',
        fieldId: 'email',
        oldValue: null,
        newValue: 'new@example.com',
      };
      expect(evaluateTrigger(trigger, context)).toBe(true);
    });

    it('should handle empty string values', () => {
      const trigger = {
        type: 'FIELD_CHANGED',
        config: { fieldId: 'email', fromValue: '' },
      };
      const context: TriggerContext = {
        triggerType: 'FIELD_CHANGED',
        fieldId: 'email',
        oldValue: '',
        newValue: 'new@example.com',
      };
      expect(evaluateTrigger(trigger, context)).toBe(true);
    });

    it('should handle numeric score of 0', () => {
      const trigger = {
        type: 'SCORE_THRESHOLD',
        config: { operator: '>', value: 0 },
      };
      const context: TriggerContext = {
        triggerType: 'SCORE_THRESHOLD',
        oldScore: 0,
        newScore: 1,
      };
      expect(evaluateTrigger(trigger, context)).toBe(true);
    });

    it('should handle large score values', () => {
      const trigger = {
        type: 'SCORE_THRESHOLD',
        config: { operator: '>=', value: 1000 },
      };
      const context: TriggerContext = {
        triggerType: 'SCORE_THRESHOLD',
        oldScore: 500,
        newScore: 1000,
      };
      expect(evaluateTrigger(trigger, context)).toBe(true);
    });
  });
});
