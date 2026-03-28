# Phase 2.3: Custom Fields & Workflow Automation - Design Specification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans (recommended) to implement this plan task-by-task.

**Goal:** Enable organizations to extend Lead and Campaign data models with custom fields, and create visual no-code automation workflows with triggers, conditions, and actions.

**Architecture:** Two-tier system—Custom Fields layer extends data models with user-defined attributes; Workflow Automation layer provides a visual builder for rule-based automation. Extensible action/trigger/condition system supports future enhancements (branching, webhooks, loops) without architectural changes.

**Tech Stack:** Prisma ORM, Next.js API routes, React visual builder (drag-and-drop canvas), JSON for workflow definitions, job scheduler for async execution

---

## Context & Constraints

**Existing Foundation:**
- Multi-tenancy with orgId scoping throughout
- Lead and Campaign models (Prisma ORM)
- Job scheduler (hourly and 6-hourly jobs)
- Messaging system (Phase 2.2) with templates and multi-channel support
- Activity logging via LeadActivity model
- User auth with role-based access control

**Scope:** Custom fields on Lead and Campaign entities; visual workflow builder with triggers/conditions/actions; real-time and time-based execution.

**Extensibility:** Architecture designed to support future features (branching, loops, webhooks, custom actions) without major rewrites.

---

## System Architecture

### Custom Fields System

**Data Model:**

```
CustomField
├── id (UUID)
├── orgId (required for multi-tenancy)
├── entityType ("lead" | "campaign")
├── name (field name, e.g., "Product Interest")
├── type ("text" | "number" | "email" | "select" | "date" | "checkbox" | "textarea")
├── isRequired (boolean)
├── sortOrder (for form display)
├── config (JSON: options for select type, validation rules, etc.)
├── createdBy (userId)
├── createdAt, updatedAt
└── indexes: (orgId, entityType), (orgId, createdAt)

Lead (modified)
├── ... existing fields ...
└── customValues (JSON: { fieldId: value, fieldId: value, ... })

Campaign (modified)
├── ... existing fields ...
└── customValues (JSON: { fieldId: value, fieldId: value, ... })
```

**Validation:**
- Type-specific validation (email regex, number range, date format)
- Required field enforcement at API level
- Select options validated against field config
- Custom field names must be unique per org per entityType

**API Endpoints:**

```
POST /api/organizations/[orgId]/custom-fields
GET /api/organizations/[orgId]/custom-fields?entityType=lead
GET /api/organizations/[orgId]/custom-fields/[fieldId]
PUT /api/organizations/[orgId]/custom-fields/[fieldId]
DELETE /api/organizations/[orgId]/custom-fields/[fieldId]
```

---

### Workflow Automation System

**Core Concepts:**

A workflow is a rule that executes when a trigger fires. It evaluates conditions and executes actions in sequence.

**Workflow Structure:**

```
Workflow
├── id (UUID)
├── orgId (required)
├── name (e.g., "High-Value Lead Automation")
├── description (optional)
├── entityType ("lead" | "campaign")
├── isActive (boolean, can pause without deleting)
├── trigger (JSON: type, config)
├── conditions (JSON array: field, operator, value)
├── conditionLogic ("AND" | "OR", how to combine conditions)
├── actions (JSON array: type, config)
├── createdBy (userId)
├── createdAt, updatedAt
└── indexes: (orgId, isActive), (orgId, entityType)
```

**Trigger Types:**

```
1. ENTITY_CREATED
   Config: entityType ("lead" | "campaign")
   Fires: When new lead/campaign created

2. FIELD_CHANGED
   Config: entityType, fieldId, oldValue (optional, if specific change)
   Fires: When specified field changes

3. STATUS_CHANGED
   Config: entityType, toStatus (e.g., "contacted")
   Fires: When status field changes to specific value

4. SCORE_THRESHOLD
   Config: operator ("<" | ">" | "=" | ">="), value (e.g., 75)
   Fires: When lead score crosses threshold

5. TIME_BASED
   Config: frequency ("daily" | "weekly" | "monthly"), time (HH:mm)
   Fires: On schedule, evaluates conditions for each matching entity
```

**Condition Operators:**

```
Text/Email: equals, contains, starts_with, ends_with, not_equals
Number: equals, >, <, >=, <=, not_equals, between
Select: equals, in, not_equals
Date: equals, before, after, between
Checkbox: is_true, is_false
```

**Action Types:**

```
1. SEND_MESSAGE
   Config: channel ("email" | "sms" | "whatsapp"), templateId
   Behavior: Enqueues message via MessageQueue

2. UPDATE_FIELD
   Config: entityType, fieldId, value (can use {{variables}})
   Behavior: Updates built-in or custom field

3. CHANGE_STATUS
   Config: entityType, newStatus
   Behavior: Updates status field

4. ADD_TO_CAMPAIGN
   Config: campaignId
   Behavior: Adds lead to campaign (lead-only)

5. REMOVE_FROM_CAMPAIGN
   Config: campaignId
   Behavior: Removes lead from campaign (lead-only)

6. CREATE_TASK
   Config: title, description, dueInDays
   Behavior: Creates task for team member (future: assign to user)
```

**Execution Model:**

```
Real-time Triggers (ENTITY_CREATED, FIELD_CHANGED, STATUS_CHANGED, SCORE_THRESHOLD):
├── Trigger fires → Query active workflows matching trigger
├── For each matching workflow:
│   ├── Evaluate conditions (AND/OR logic)
│   ├── If conditions pass, execute actions in sequence
│   ├── Log execution with results
│   └── Handle errors (retry transient, log permanent failures)
└── Return success/failure status

Time-based Triggers (TIME_BASED):
├── Job scheduler (5-minute interval) checks for scheduled workflows
├── For each time-based workflow:
│   ├── Query entities matching entityType
│   ├── For each entity, evaluate conditions and execute actions
│   ├── Log each execution
│   └── Batch update/log operations
└── Handle bulk failures gracefully
```

**Data Models for Execution:**

```
WorkflowExecution
├── id (UUID)
├── workflowId (foreign key)
├── orgId (denormalized for query efficiency)
├── entityId (leadId or campaignId)
├── entityType ("lead" | "campaign")
├── triggeredAt (DateTime)
├── completedAt (DateTime, NULL if in progress)
├── status ("pending" | "running" | "success" | "failed" | "partial")
├── conditionsMet (boolean, null if still evaluating)
├── actionResults (JSON: [{ actionIndex, status, output, error }])
├── errorMessage (if status = "failed")
├── retryCount (0-2)
├── createdAt
└── indexes: (workflowId, triggeredAt), (orgId, completedAt), (entityId, entityType)
```

---

### Visual Workflow Builder

**UI Components:**

1. **Workflow Canvas**
   - Drag-and-drop canvas with trigger node, condition nodes, action nodes
   - Node types: Trigger, Condition Group, Action
   - Lines show flow (trigger → conditions → actions)
   - Side panel shows node configuration

2. **Trigger Selector**
   - Dropdown to select trigger type
   - Dynamic config form based on trigger (e.g., select field for FIELD_CHANGED)

3. **Condition Builder**
   - "Add Condition" button creates new row
   - Row: [Field Selector] [Operator] [Value Input] [AND/OR toggle]
   - AND/OR logic selector at condition group level
   - Preview: "If score > 75 AND status = new, then..."

4. **Action Builder**
   - "Add Action" button creates new action row
   - Row: [Action Type Selector] [Config Form]
   - Actions execute in order (numbered list)
   - Preview shows action summary

5. **Test Mode**
   - Select a sample lead/campaign
   - Dry-run workflow (no actual execution)
   - Show which conditions would match, which actions would execute
   - Helpful for validation before activation

6. **Execution Logs**
   - Show recent executions of active workflows
   - Filter by workflow, status (success/failed), date range
   - Click to see details (condition evaluation, action results, errors)
   - Export logs as CSV

---

### Integration Points

**With Messaging (Phase 2.2):**
- Workflow SEND_MESSAGE action enqueues via MessageQueueService
- Template variables ({{firstName}}, {{customFieldName}}) auto-substitute
- Delivery status tracked in existing MessageQueue/MessageLog

**With Lead Scoring (Phase 1):**
- SCORE_THRESHOLD trigger fires when scoring job updates lead score
- Workflow actions can update custom fields that affect scoring factors
- Score changes logged to LeadActivity

**With Campaigns:**
- ADD_TO_CAMPAIGN / REMOVE_FROM_CAMPAIGN actions manage lead-campaign associations
- Useful for dynamic segmentation workflows

**With Custom Fields:**
- Conditions reference custom fields by fieldId
- Actions can update custom field values
- Field type determines available operators (e.g., number fields support >, <)

---

### Error Handling & Retry Logic

**Transient Errors (retry up to 2 times):**
- Message queue full (add to queue later)
- Network timeout on webhook
- Database lock (concurrent update)
- Strategy: Exponential backoff (1 min, 5 min)

**Permanent Errors (no retry):**
- Invalid field reference (custom field was deleted)
- Invalid campaign ID (campaign was deleted)
- Condition evaluation error (malformed condition config)
- Action: Log error, mark execution as failed, alert admin

**Partial Success:**
- If action 3 fails after actions 1-2 succeed, mark as "partial"
- Log which actions succeeded and which failed
- Don't retry entire workflow, only retry failed action

---

## Features

### 1. Custom Field Management

**What:** Users define custom fields per organization per entity type.

**Who uses it:** Organization admins define schema; all team members see and use custom fields in forms and filters.

**Field Types:**
- Text (short text, max 255 chars)
- Number (integer or decimal, optional min/max)
- Email (validated format)
- Select (dropdown with predefined options)
- Date (date picker, optional validation)
- Checkbox (true/false)
- Textarea (long text, max 10000 chars)

**Validation:**
- Unique field names per org per entity
- Reserved names blacklist (id, createdAt, etc.)
- Type-specific validation rules

**Display:**
- Lead/Campaign forms show custom fields alongside built-in fields
- List views can include custom fields as columns (configurable)
- Bulk actions can update custom fields

### 2. Workflow Builder (No-Code Visual)

**What:** Drag-and-drop interface to create automation rules.

**Who uses it:** Admins and power users create workflows; execution is automatic.

**Capabilities:**
- Select trigger, define conditions, add actions
- Test before activation
- View execution logs
- Pause/activate workflows without deleting

**Limits (MVP):**
- Sequential actions only (no branching/loops)
- Single condition group (AND/OR, not nested)
- Built-in actions only (no custom code)

### 3. Automation Execution

**What:** Workflows execute automatically when triggers fire.

**Real-time Execution:**
- ENTITY_CREATED, FIELD_CHANGED, STATUS_CHANGED, SCORE_THRESHOLD
- Synchronous execution (within same request if possible)
- Logged to WorkflowExecution
- Errors logged for manual review

**Time-based Execution:**
- TIME_BASED trigger (daily/weekly/monthly at specific time)
- Job scheduler runs every 5 minutes
- Evaluates conditions for all matching entities
- Batch executes actions, logs results

### 4. Execution Logging & Debugging

**What:** Track every workflow execution for debugging and audit.

**Logs Include:**
- Trigger details (what fired the workflow)
- Condition evaluation (which conditions passed/failed)
- Actions executed (which actions ran, results)
- Errors (if any step failed)
- Timestamps (triggered, completed, duration)

**Admin Interface:**
- View logs filtered by workflow, status, date
- Search by entity (lead name, campaign)
- Export as CSV for analysis
- Alert on repeated failures

### 5. Extensibility Points

**Action Plugin System (Future):**
- New actions can be registered without code changes
- Action definitions specify config schema
- Executor dispatches to action handler

**Trigger Plugin System (Future):**
- Custom triggers via webhook or job
- Useful for external integrations

**Condition Engine (Future):**
- Support branching (if/else paths)
- Support loops (for each matching entity)
- Support nested conditions (complex logic)

**Variable Expansion (Future):**
- {{customFieldName}} in action values
- {{leadName}}, {{campaignName}} in templates
- Computed values (date arithmetic, string manipulation)

---

## API Endpoints

### Custom Fields Management

```
POST /api/organizations/[orgId]/custom-fields
  Body: { entityType, name, type, isRequired, config }
  Returns: CustomField object

GET /api/organizations/[orgId]/custom-fields?entityType=lead
  Returns: CustomField[]

GET /api/organizations/[orgId]/custom-fields/[fieldId]
  Returns: CustomField object

PUT /api/organizations/[orgId]/custom-fields/[fieldId]
  Body: { name?, type?, isRequired?, config? }
  Returns: CustomField object

DELETE /api/organizations/[orgId]/custom-fields/[fieldId]
  Returns: { success: true }
```

### Workflow Management

```
POST /api/organizations/[orgId]/workflows
  Body: { name, description?, entityType, trigger, conditions, conditionLogic, actions }
  Returns: Workflow object

GET /api/organizations/[orgId]/workflows?entityType=lead
  Returns: Workflow[]

GET /api/organizations/[orgId]/workflows/[workflowId]
  Returns: Workflow object

PUT /api/organizations/[orgId]/workflows/[workflowId]
  Body: { name?, description?, trigger?, conditions?, actions?, isActive? }
  Returns: Workflow object

DELETE /api/organizations/[orgId]/workflows/[workflowId]
  Returns: { success: true }

POST /api/organizations/[orgId]/workflows/[workflowId]/test
  Body: { entityId }
  Returns: { conditionsMet: boolean, actionsWouldExecute: Action[] }

GET /api/organizations/[orgId]/workflows/[workflowId]/executions?limit=50
  Returns: WorkflowExecution[]

GET /api/organizations/[orgId]/workflows/executions?status=failed
  Returns: WorkflowExecution[]
```

---

## Configuration

**Environment Variables:**

```
# Workflow Execution
WORKFLOW_EXECUTION_BATCH_SIZE=100
WORKFLOW_EXECUTION_TIMEOUT_SECONDS=30
WORKFLOW_MAX_RETRIES=2
WORKFLOW_RETRY_BACKOFF_MULTIPLIER=2

# Feature Flags (Future)
ENABLE_WORKFLOW_BRANCHING=false
ENABLE_WORKFLOW_LOOPS=false
ENABLE_CUSTOM_ACTIONS=false
ENABLE_WEBHOOK_TRIGGERS=false
```

---

## Testing Strategy

**Unit Tests:**
- Custom field validation (type checking, required fields)
- Condition evaluation (all operators, AND/OR logic)
- Action execution (state changes, message queueing)
- Variable substitution in action values

**Integration Tests:**
- Complete workflow execution (trigger → conditions → actions)
- Time-based workflow job scheduler
- Custom field storage and retrieval
- Multi-tenancy isolation (workflows don't execute across orgs)

**Manual Testing:**
- Visual builder usability
- Real-time trigger execution
- Time-based trigger scheduling
- Execution logs accuracy

---

## Success Criteria

✅ Custom fields (text, number, email, select, date, checkbox) can be defined
✅ Lead and Campaign models extended with customValues JSON field
✅ Custom fields appear in forms and can be updated
✅ Workflows can be created via visual builder
✅ Triggers work (entity created, field changed, status changed, score threshold, time-based)
✅ Conditions evaluate correctly (all operators, AND/OR logic)
✅ Actions execute (send message, update field, change status, add/remove from campaign)
✅ Execution logged with results and errors
✅ Test mode validates workflows before activation
✅ Multi-tenancy enforced (orgId scoping)
✅ Architecture supports future features (branching, webhooks, loops, custom actions)

---

## Known TODOs (Phase 2.4+)

- **Branching/Conditional Actions:** If/else paths in workflows
- **Loops:** For each matching entity, repeat actions
- **Webhook Triggers:** External systems trigger workflows
- **Custom Actions:** User-defined actions via plugins
- **Advanced Conditions:** Nested AND/OR, cross-entity conditions
- **Workflow Versioning:** Track versions, rollback capability
- **A/B Testing:** Test different workflow versions
- **Variable Expansion:** {{field}} in action values
- **Scheduled Workflows:** Run at specific dates/times
- **Workflow Analytics:** Metrics on workflow success rates, ROI
