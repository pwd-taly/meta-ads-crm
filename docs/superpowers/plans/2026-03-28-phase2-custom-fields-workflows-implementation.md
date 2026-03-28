# Phase 2.3: Custom Fields & Workflow Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable organizations to extend Lead and Campaign data models with custom fields, and create visual no-code automation workflows with triggers, conditions, and actions.

**Architecture:** Two-layer system—Custom Fields layer extends data models with user-defined attributes; Workflow Automation layer provides execution engine (trigger evaluation → condition matching → action execution) with real-time and time-based job scheduling. Database-backed storage with comprehensive logging for execution debugging.

**Tech Stack:** Prisma ORM, Next.js API routes, React visual builder, JSON for workflow definitions, Vitest for testing

---

## File Structure Overview

### Database & Core Logic
- `prisma/schema.prisma` - CustomField, Workflow, WorkflowExecution models
- `lib/custom-fields/validation.ts` - Field type validation
- `lib/workflows/trigger-evaluator.ts` - Trigger matching
- `lib/workflows/condition-evaluator.ts` - Condition evaluation with operators
- `lib/workflows/action-executor.ts` - Action execution
- `lib/workflows/workflow-runner.ts` - Orchestration

### API Layer
- `app/api/organizations/[orgId]/custom-fields/route.ts` - Custom field CRUD
- `app/api/organizations/[orgId]/custom-fields/[fieldId]/route.ts` - Field detail operations
- `app/api/organizations/[orgId]/workflows/route.ts` - Workflow CRUD
- `app/api/organizations/[orgId]/workflows/[workflowId]/route.ts` - Workflow detail operations
- `app/api/organizations/[orgId]/workflows/[workflowId]/test/route.ts` - Workflow test mode
- `app/api/organizations/[orgId]/workflows/[workflowId]/executions/route.ts` - Execution history

### UI Components
- `components/custom-fields/CustomFieldForm.tsx` - Field creation/editing
- `components/custom-fields/CustomFieldsManager.tsx` - Field list management
- `components/workflows/WorkflowBuilder.tsx` - Main canvas
- `components/workflows/TriggerSelector.tsx` - Trigger configuration
- `components/workflows/ConditionBuilder.tsx` - Condition configuration
- `components/workflows/ActionBuilder.tsx` - Action configuration
- `components/workflows/WorkflowExecutionLogs.tsx` - Execution history viewer

### Tests
- `tests/custom-fields-validation.test.ts` - Field validation
- `tests/workflows-triggers.test.ts` - Trigger evaluation
- `tests/workflows-conditions.test.ts` - Condition operators
- `tests/workflows-actions.test.ts` - Action execution
- `tests/workflows-execution.test.ts` - Complete flows

---

## Tasks

### Task 1: Add CustomField, Workflow, and WorkflowExecution Models

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/[timestamp]_add_custom_fields_workflows/migration.sql`

- [ ] **Step 1: Update prisma/schema.prisma with CustomField model**

Add after Campaign model:

```prisma
model CustomField {
  id        String   @id @default(cuid())
  orgId     String
  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  entityType String   // "lead" or "campaign"
  name      String
  type      String   // "text", "number", "email", "select", "date", "checkbox", "textarea"
  isRequired Boolean  @default(false)
  sortOrder Int      @default(0)
  config    Json?    // options for select, validation rules, etc.
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([orgId, entityType, name])
  @@index([orgId, entityType])
  @@index([orgId, createdAt])
}
```

- [ ] **Step 2: Add customValues to Lead and Campaign**

In Lead model, add: `customValues Json? @default("{}")`
In Campaign model, add: `customValues Json? @default("{}")`

- [ ] **Step 3: Add Workflow and WorkflowExecution models**

```prisma
model Workflow {
  id             String   @id @default(cuid())
  orgId          String
  org            Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  name           String
  description    String?
  entityType     String
  isActive       Boolean  @default(false)
  trigger        Json
  conditions     Json     @default("[]")
  conditionLogic String   @default("AND")
  actions        Json     @default("[]")
  createdBy      String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  executions     WorkflowExecution[]

  @@index([orgId, isActive])
  @@index([orgId, entityType])
}

model WorkflowExecution {
  id             String   @id @default(cuid())
  workflowId     String
  workflow       Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  orgId          String
  entityId       String
  entityType     String
  triggeredAt    DateTime @default(now())
  completedAt    DateTime?
  status         String   @default("pending")
  conditionsMet  Boolean?
  actionResults  Json     @default("[]")
  errorMessage   String?
  retryCount     Int      @default(0)
  createdAt      DateTime @default(now())

  @@index([workflowId, triggeredAt])
  @@index([orgId, completedAt])
  @@index([entityId, entityType])
}
```

- [ ] **Step 4: Update Organization relations**

Add to Organization: `customFields CustomField[]` and `workflows Workflow[]`

- [ ] **Step 5: Run migration**

```bash
npx prisma migrate dev --name add_custom_fields_workflows
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add CustomField, Workflow, and WorkflowExecution models"
```

---

### Task 2: Create Custom Field Validation Service

**Files:**
- Create: `lib/custom-fields/validation.ts`
- Create: `tests/custom-fields-validation.test.ts`

Tests cover: field name validation (reserved names, uniqueness), type validation, config validation (select options, number ranges), value validation (type-specific, length limits, email/date formats).

Expected: All validation functions with proper error messages.

---

### Task 3: Create Custom Fields CRUD API Endpoints

**Files:**
- Create: `app/api/organizations/[orgId]/custom-fields/route.ts`
- Create: `app/api/organizations/[orgId]/custom-fields/[fieldId]/route.ts`

GET/POST on `/custom-fields`, GET/PUT/DELETE on `/custom-fields/[fieldId]`. Includes validation, role checks (admin/owner), uniqueness checks, sort order management.

---

### Task 4: Implement Workflow Trigger Evaluator

**Files:**
- Create: `lib/workflows/trigger-evaluator.ts`
- Create: `tests/workflows-triggers.test.ts`

Implements: ENTITY_CREATED, FIELD_CHANGED, STATUS_CHANGED, SCORE_THRESHOLD, TIME_BASED trigger types. Evaluates triggers against entity and trigger context.

---

### Task 5: Implement Workflow Condition Evaluator

**Files:**
- Create: `lib/workflows/condition-evaluator.ts`
- Create: `tests/workflows-conditions.test.ts`

Operators: text (equals, contains, starts_with, ends_with, not_equals), number (>, <, >=, <=, =, between), select (in), checkbox (is_true, is_false), date (before, after, equals). AND/OR logic combining.

---

### Task 6: Implement Workflow Action Executor

**Files:**
- Create: `lib/workflows/action-executor.ts`
- Create: `tests/workflows-actions.test.ts`

Actions: SEND_MESSAGE, UPDATE_FIELD, CHANGE_STATUS, ADD_TO_CAMPAIGN, REMOVE_FROM_CAMPAIGN, CREATE_TASK. Includes variable substitution ({{firstName}}, {{lastName}}, {{date:YYYY-MM-DD}}).

---

### Task 7: Implement Workflow Orchestration Engine

**Files:**
- Create: `lib/workflows/workflow-runner.ts`
- Create: `tests/workflows-execution.test.ts`

executeWorkflow() function: trigger → conditions → actions. Creates WorkflowExecution records with detailed logging. Handles partial failures (some actions fail, others succeed).

---

### Task 8: Create Workflow Management CRUD Endpoints

**Files:**
- Create: `app/api/organizations/[orgId]/workflows/route.ts`
- Create: `app/api/organizations/[orgId]/workflows/[workflowId]/route.ts`

GET/POST on `/workflows`, GET/PUT/DELETE on `/workflows/[workflowId]`. List filtering by entityType and isActive. Validation of trigger, conditions, actions structure.

---

### Task 9: Create Workflow Test Mode Endpoint

**Files:**
- Create: `app/api/organizations/[orgId]/workflows/[workflowId]/test/route.ts`

POST endpoint accepts entityId, evaluates workflow against sample entity, returns: triggerMatches, conditionsMet, actionsWouldExecute, detailed evaluation for each condition.

---

### Task 10: Create Workflow Execution History Endpoints

**Files:**
- Create: `app/api/organizations/[orgId]/workflows/[workflowId]/executions/route.ts`
- Create: `app/api/organizations/[orgId]/workflows/executions/route.ts`

Per-workflow and org-wide execution history. Pagination with limit/offset. Filtering by status. Returns execution details: status, conditionsMet, actionResults, errorMessage.

---

### Task 11: Add Time-Based Workflow Job Scheduler

**Files:**
- Modify: `lib/jobs/schedule-jobs.ts`
- Create: `tests/workflows-time-based.test.ts`

processTimeBasedWorkflows() function. Runs every 5 minutes. Evaluates TIME_BASED trigger workflows at their scheduled times (daily/weekly/monthly). Batch processes entities.

---

### Task 12: Create Custom Field Form Component

**Files:**
- Create: `components/custom-fields/CustomFieldForm.tsx`

React component for creating/editing custom fields. Form fields: name, type (select), isRequired (checkbox), config (conditional fields based on type), sortOrder. Validation feedback.

---

### Task 13: Create Custom Fields Manager Component

**Files:**
- Create: `components/custom-fields/CustomFieldsManager.tsx`

Page component listing custom fields per org and entity type (lead/campaign tabs). CRUD operations, drag-to-reorder (sortOrder), delete confirmation, type icons.

---

### Task 14: Create Custom Field Input Component

**Files:**
- Create: `components/custom-fields/CustomFieldInput.tsx`

Renders field input based on type: TextInput (text), NumberInput (number), EmailInput (email), SelectInput (select with options), DatePicker (date), Checkbox (checkbox), Textarea (textarea).

---

### Task 15: Create Workflow Builder Canvas Component

**Files:**
- Create: `components/workflows/WorkflowBuilder.tsx`

Main visual builder canvas. Displays workflow in sequence: Trigger → Conditions → Actions. Side panel for configuring selected node. Draft/test/activate buttons. Save functionality.

---

### Task 16: Create Trigger Selector Component

**Files:**
- Create: `components/workflows/TriggerSelector.tsx`

Dropdown to select trigger type. Conditional config form: ENTITY_CREATED (entity type), FIELD_CHANGED (field selector, optional fromValue), STATUS_CHANGED (status select), SCORE_THRESHOLD (operator, number), TIME_BASED (frequency, time picker).

---

### Task 17: Create Condition Builder Component

**Files:**
- Create: `components/workflows/ConditionBuilder.tsx`

"Add Condition" button creates rows. Each row: Field selector, Operator (changes based on field type), Value input. Row controls: duplicate, delete. AND/OR toggle at group level.

---

### Task 18: Create Action Builder Component

**Files:**
- Create: `components/workflows/ActionBuilder.tsx`

"Add Action" button creates rows. Each row: Action type selector, config form (changes per type). Row controls: duplicate, delete, reorder. Actions numbered and execute sequentially.

---

### Task 19: Create Workflow Test Mode Component

**Files:**
- Create: `components/workflows/WorkflowTestMode.tsx`

Modal/panel: Select a lead/campaign entity, run test, display results. Shows: trigger matched/failed, conditions evaluation (each condition pass/fail), actions that would execute, condition details table.

---

### Task 20: Create Workflow Execution Logs Component

**Files:**
- Create: `components/workflows/WorkflowExecutionLogs.tsx`

Table of recent executions. Columns: Timestamp, Entity (lead/campaign name), Status (badge), Conditions Met, Action Count. Filter by status. Click row to see details: full action results, error messages.

---

### Task 21: Integration Test - Custom Fields CRUD

**Files:**
- Create: `tests/integration/custom-fields.test.ts`

E2E test: Create org, create custom field, update field, fetch field, delete field. Verify DB state. Test uniqueness constraint. Test validation errors.

---

### Task 22: Integration Test - Workflow Creation and Activation

**Files:**
- Create: `tests/integration/workflows-crud.test.ts`

E2E test: Create workflow with trigger/conditions/actions, fetch workflow, update isActive, test mode with sample entity, verify WorkflowExecution record created.

---

### Task 23: Integration Test - Real-Time Workflow Execution

**Files:**
- Create: `tests/integration/workflows-realtime.test.ts`

Test: Create lead → trigger ENTITY_CREATED workflow → verify WorkflowExecution created with success status. Test condition matching (pass/fail). Test action execution (SEND_MESSAGE, UPDATE_FIELD).

---

### Task 24: Integration Test - Time-Based Workflow Execution

**Files:**
- Create: `tests/integration/workflows-time-based.test.ts`

Test: Create TIME_BASED workflow, manually call processTimeBasedWorkflows(), verify executions created for matching entities. Test frequency matching (daily/weekly/monthly).

---

### Task 25: Integration Test - Multi-Tenancy Isolation

**Files:**
- Create: `tests/integration/workflows-multi-tenancy.test.ts`

Test: Create 2 orgs, create workflows/custom fields in each org, verify they don't leak between orgs. Verify scoping on all queries.

---

### Task 26: Integration Test - Workflow Error Handling

**Files:**
- Create: `tests/integration/workflows-error-handling.test.ts`

Test: Invalid field references, missing templates, failed message queueing. Verify WorkflowExecution marked as failed/partial, error messages logged.

---

### Task 27: Add Environment Variables Documentation

**Files:**
- Modify: `.env.example`

Add documented variables for custom field and workflow features (any new config needed).

---

### Task 28: Final Integration Test - Complete User Journey

**Files:**
- Create: `tests/integration/phase2-3-complete-journey.test.ts`

E2E test: Org admin creates custom field, creates workflow with that field in condition, creates lead with custom field value, workflow executes and sends message. Verify all components working together.

---

**Total Tasks:** 28

All tasks follow TDD (failing test → implementation → passing test → commit). Database operations tested against real Prisma client. API endpoints tested with NextRequest mocks and requireAuth/requireRole enforcement.
