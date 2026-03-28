# Phase 1 Stream 1: AI & Automation Tasks

## Task 1: Update Prisma Schema
- Add AI fields to Lead model: `aiScore`, `scoreReason`, `lastScoredAt`, `followUpAction`, `followUpDueDate`, `followUpMessage`
- Create LeadActivity model for audit tracking
- Generate migration

## Task 2: Implement Scoring Algorithm
- Create `lib/jobs/score-leads.ts`
- Implement `calculateScore()` function
- Implement `scoreLeadsForOrg()` and `scoreAllLeads()` functions

## Task 3: Manual Scoring Endpoint
- Create `app/api/leads/[id]/score/route.ts`
- Admin-only endpoint for manual scoring trigger

## Task 4: Background Job Endpoint
- Create `app/api/ai/score-leads/route.ts`
- Admin-only endpoint to trigger scoring for all leads

## Task 5: Campaign Optimization Tips
- Create `app/api/campaigns/[id]/optimization-tips/route.ts`
- Generate budget, ROI, CTR, conversion rate suggestions

## Task 6: Follow-up Management (3 endpoints)
- `app/api/leads/[id]/follow-up/route.ts` - Schedule follow-up
- `app/api/leads/follow-ups-due/route.ts` - List due follow-ups
- `app/api/leads/[id]/send-followup/route.ts` - Send follow-up

## Task 7: Job Scheduler
- Create `lib/jobs/schedule-jobs.ts`
- Initialize in `app/layout.tsx` for hourly scoring

## Task 8 & 9: Tests
- `tests/scoring.test.ts` - Unit tests for scoring
- `tests/stream1-integration.test.ts` - Integration tests

## Task 10: Verification
- Manual testing of all endpoints
- Verify database fields populate correctly
