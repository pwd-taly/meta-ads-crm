# Comprehensive App Update Design
## Meta Ads CRM: Multi-Tenancy, AI, UX & Scope Expansion

**Date:** 2026-03-28
**Scope:** Phase 0 (Foundation) + Phase 1 (Three parallel streams)
**Status:** Design phase

---

## Executive Summary

Transform Meta Ads CRM from single-account to multi-tenant SaaS platform with comprehensive improvements across three areas:

1. **Phase 0:** Multi-tenancy foundation (prerequisite for all Phase 1 work)
2. **Phase 1:** Three parallel streams
   - Stream 1: AI & Automation (lead scoring, optimization, smart follow-up)
   - Stream 2: UX & Performance (mobile, visualization, workflows, speed)
   - Stream 3: Scope Expansion (multi-account, team collab, Meta API sync, reporting)

---

## Phase 0: Multi-Tenancy Refactor

### Current State
- Single-account architecture
- Global `Settings` table stores Meta credentials
- No user concept (JWT auth on single user)
- No data isolation mechanism
- All data models assume single organization

### New Architecture

**Core Principle:** Every resource belongs to exactly one organization. Data isolation enforced at API layer.

### Database Schema

#### New Tables

```sql
Organization
  id: String @id @default(cuid())
  name: String
  slug: String @unique
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt
```

```sql
User
  id: String @id @default(cuid())
  email: String @unique
  passwordHash: String
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt
```

```sql
OrganizationMember
  id: String @id @default(cuid())
  userId: String @fk(User.id)
  orgId: String @fk(Organization.id)
  role: String @enum ["admin", "manager", "viewer"]
  joinedAt: DateTime @default(now())

  @@unique([userId, orgId])
```

```sql
MetaAdAccount
  id: String @id @default(cuid())
  orgId: String @fk(Organization.id)
  metaAccessToken: String
  metaAdAccountId: String
  metaPageId: String?
  webhookVerifyToken: String?
  waMessageTemplate: String?
  waMessageTemplateEs: String?
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt
```

```sql
APIIntegration
  id: String @id @default(cuid())
  orgId: String @fk(Organization.id)
  type: String @enum ["meta", "slack", "hubspot"]
  accessToken: String
  metadata: Json? -- for storing flexible config per integration type
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt
```

#### Modified Tables

**Lead** — Add organization scoping:
```sql
Lead {
  ...existing fields...
  orgId: String @fk(Organization.id)
  metaAdAccountId: String? @fk(MetaAdAccount.id)

  @@index([orgId, status])
  @@index([orgId, createdAt])
}
```

**Campaign** (new):
```sql
Campaign
  id: String @id @default(cuid())
  orgId: String @fk(Organization.id)
  metaAdAccountId: String @fk(MetaAdAccount.id)
  metaCampaignId: String @unique
  name: String
  status: String @enum ["active", "paused", "archived"]
  budget: Float?
  spend: Float?
  impressions: Int?
  clicks: Int?
  conversions: Int?
  syncedAt: DateTime?
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt

  @@index([orgId])
  @@index([orgId, status])
```

**Delete:** `Settings` table (replaced by per-org `MetaAdAccount`)

### Auth Refactor

**Registration:**
```
POST /api/auth/register
{
  email: string,
  password: string,
  orgName: string
}
→ Creates User, Organization, OrganizationMember(admin role)
→ Returns JWT { userId, orgId, email, role }
```

**Login:**
```
POST /api/auth/login
{
  email: string,
  password: string
}
→ Returns JWT { userId, orgId, email, role }
→ If user is member of multiple orgs, returns all orgs; UI prompts selection
```

**JWT Structure:**
```json
{
  "userId": "user_123",
  "orgId": "org_456",
  "email": "user@example.com",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234571490
}
```

**Middleware (updated):**
- Extract `orgId` from JWT
- Validate token hasn't expired
- Inject `{ userId, orgId, role }` into request context for all routes
- Public paths: `/login`, `/api/auth/*`, `/api/meta/webhook`

### API Layer Changes

**Data Access Pattern:**
All queries include `orgId` filter:
```typescript
// Example: Get leads for current org
const leads = await prisma.lead.findMany({
  where: { orgId: req.context.orgId },
  orderBy: { createdAt: 'desc' }
});
```

**Authorization Middleware:**
- Routes that access org resources check `req.context.role` against required permissions
- Example roles: admin (full access), manager (read + write limited), viewer (read-only)

### Data Migration

**Existing data:**
- Create default `Organization` for existing user
- Migrate all existing `Lead` records → assign to default org
- Migrate `Settings.metaAccessToken` → new `MetaAdAccount` record

**No data loss:** All existing leads, campaigns continue working under new org structure.

---

## Phase 1: Parallel Streams

### Stream 1: AI & Automation

**Goal:** Intelligent lead prioritization and automated follow-up suggestions.

#### Lead Scoring

**Database:**
```sql
Lead {
  ...
  aiScore: Int? -- 0-100, higher = more likely to convert
  scoreReason: String? -- Why this score (e.g., "engaged 3x, multiple form fills")
  lastScoredAt: DateTime?
}
```

**Scoring Algorithm:**
- Engagement count (form fills, clicks)
- Time since last interaction
- Campaign performance (if from high-performing campaign, boost score)
- Contact status (some statuses = higher priority)
- Rule: Recalculate daily via background job

**API:**
- `GET /api/leads?sortBy=score` — Returns leads sorted by AI score
- `POST /api/ai/score-leads` — Trigger immediate rescoring (admin only)

#### Campaign Optimization Suggestions

**Data fetched from Meta API:**
- Campaign spend vs budget
- ROI by campaign
- Cost per conversion trend
- Ad performance by placement

**Suggestions generated:**
- "Campaign X: Lower bid by 15% (same conversion rate, less spend)"
- "Pause low-ROI placements on Campaign Y"
- "Increase budget for Campaign Z (ROAS > 3x)"

**API:**
- `GET /api/campaigns/{id}/optimization-tips` — Returns 3-5 actionable suggestions
- Called when user views campaign detail page

#### Smart Lead Follow-up

**Database:**
```sql
Lead {
  ...
  followUpAction: String? @enum ["email", "call", "whatsapp", "none"]
  followUpDueDate: DateTime?
  followUpMessage: String? -- AI-generated or custom
}

LeadActivity {
  id: String @id
  leadId: String @fk(Lead.id)
  orgId: String @fk(Organization.id)
  action: String @enum ["created", "status_changed", "message_sent", "follow_up_completed"]
  timestamp: DateTime @default(now())
  metadata: Json?

  @@index([leadId])
  @@index([orgId, timestamp])
}
```

**Follow-up Logic:**
- When lead created: AI suggests best next action (email/call/WhatsApp)
- Generate template message (both English & Spanish)
- Set due date (e.g., 24h from now)
- Dashboard shows "Follow-ups due today" widget

**API:**
- `POST /api/leads/{id}/follow-up-action` — Create scheduled follow-up
- `GET /api/leads/follow-ups-due` — Returns leads needing follow-up today
- `POST /api/leads/{id}/send-followup` — Send message, mark completed

---

### Stream 2: UX & Performance

**Goal:** Better usability, faster performance, richer data visualization.

#### Mobile Responsiveness

**Approach:** Refine existing Tailwind layout (already responsive, needs touch optimization)
- Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Touch-friendly buttons: min `h-12 w-12` (48x48px)
- Simplified modals on mobile (full height)
- Horizontal scroll for tables on mobile

**Pages to refine:**
- Dashboard (metric cards stack on mobile)
- Leads table (collapse columns, swipe for details)
- Campaigns (simplified view on mobile)
- Settings (stacked forms)

#### Enhanced Data Visualization

**Dashboard Charts (using Recharts, already in deps):**

1. **Lead Funnel**
   - X-axis: stages (new → contacted → qualified → converted)
   - Y-axis: count
   - Shows drop-off at each stage

2. **Conversion Rate Trend**
   - X-axis: date (last 30 days)
   - Y-axis: conversion %
   - Line chart with color change if trending down

3. **Campaign ROI by Campaign**
   - Bar chart: each bar = campaign, height = ROI multiple
   - Color: green (positive) / red (negative)

4. **Lead Status Breakdown**
   - Pie chart: percentage of leads in each status
   - Click segment to filter leads table

5. **Campaign Spend vs Conversions**
   - Scatter plot: X = spend, Y = conversions
   - Bubble size = lead quality (AI score)

**Pages:**
- Dashboard: charts 1-4
- Campaigns page: chart 5

#### Workflow Improvements

**Bulk Lead Actions:**
- Checkbox column on leads table
- "Change status" dropdown (applies to all selected)
- "Add tag" / "Remove tag" (future: implement tags system)
- "Assign to team member" (uses new OrganizationMember table)

**Advanced Filtering:**
- Sidebar with filters:
  - Status (multi-select)
  - Date range (created, updated)
  - Campaign (multi-select)
  - AI score range (slider)
  - Contact (email/phone contains)
- Apply/Reset buttons
- Saved filters (optional, future enhancement)

**Keyboard Shortcuts (power users):**
- `k` — Focus search
- `l` — Jump to leads page
- `c` — Jump to campaigns
- `n` — Create new lead
- `?` — Show help

#### Performance Optimization

**Database Indexing:**
```sql
CREATE INDEX idx_lead_org_status ON Lead(orgId, status);
CREATE INDEX idx_lead_org_created ON Lead(orgId, createdAt DESC);
CREATE INDEX idx_campaign_org ON Campaign(orgId, status);
CREATE INDEX idx_member_user ON OrganizationMember(userId);
```

**API Pagination:**
```
GET /api/leads?page=1&limit=50
→ Returns { data: [...], total: 1234, page: 1, pages: 25 }
```

**Lazy-load Charts:**
- Dashboard loads metric cards first (fast)
- Charts load asynchronously, show skeleton while loading
- Cache chart data for 1 hour (less frequent API calls to Meta)

---

### Stream 3: Scope Expansion

**Goal:** Multi-account support, team features, deeper Meta integration, reporting.

#### Multi-Account Management

**Existing:** Each org has one Meta account (stored in `MetaAdAccount` from Phase 0)

**New:**
- One org can have multiple `MetaAdAccount` records
- Each account has separate credentials, webhooks, leads, campaigns

**Org Dashboard Selector:**
```
Header: [Org Name v] [Meta Account: Account 1 v]
         └─ Switch account
         └─ + Add account
```

**Data Model:**
- Leads belong to `orgId` + `metaAdAccountId`
- Campaigns belong to `orgId` + `metaAdAccountId`
- UI filters by selected account

#### Team Collaboration

**Roles & Permissions:**
- **admin:** Full access, manage team, settings
- **manager:** Read/write leads & campaigns, view reports, no team management
- **viewer:** Read-only access

**Invite Flow:**
```
POST /api/organizations/{orgId}/invites
{
  email: string,
  role: "admin" | "manager" | "viewer"
}
→ Creates invite token, sends email with link
→ Link: /invite/{token}?orgId={orgId}
→ User clicks, accepts, joins organization
```

**Activity Log:**
```
GET /api/organizations/{orgId}/activity-log
→ Returns [
  { userId, action: "lead_created", leadId, timestamp },
  { userId, action: "lead_status_changed", leadId, oldStatus, newStatus, timestamp },
  { userId, action: "member_invited", invitedEmail, timestamp }
]
```

#### Meta API Integration

**Real-time Sync:**
- Background job (runs hourly): Fetch campaigns from Meta API
- For each campaign: Create/update `Campaign` record in DB
- Sync metrics: spend, impressions, clicks, conversions

**Webhook Listener (existing `/api/meta/webhook`):**
- Listen for Meta lead webhook events
- Update existing lead if `metaLeadId` matches, else create new
- Trigger AI scoring on new lead

**Campaign Management:**
- New page: `/app/campaigns/create` — form to create campaign via Meta API
- Edit campaign: Update bid, budget, targeting via Meta API (proxy calls)
- Status changes (pause/unpause) sync back to Meta

#### Reporting & Export

**PDF Reports:**
- `/api/reports/generate` — POST with date range, returns PDF download
- Sections:
  - Lead summary (total, by status, conversion rate)
  - Top campaigns (by ROI, spend, conversions)
  - Team activity (if multi-user)
  - Recommendations (from AI optimization engine)

**CSV Export:**
- `/api/export/leads` — CSV of all leads (filterable by date, status, campaign)
- `/api/export/campaigns` — CSV of all campaigns with metrics

**Scheduled Reports:**
- `/api/reports/schedule` — POST to set up weekly/monthly email reports
- Background job sends email with attached PDF

---

## Implementation Sequence

### Phase 0 (Sequential, prerequisite)
1. Write Prisma schema (new tables + modifications)
2. Run migration (safe: adds fields, creates new tables, preserves existing data)
3. Update auth endpoints (`/api/auth/register`, `/api/auth/login`)
4. Update middleware to enforce `orgId`
5. Migrate existing data (create default org, assign leads)
6. Test auth flow end-to-end
7. Deploy Phase 0

### Phase 1 (Parallel, 3 agents)
Once Phase 0 is deployed, launch three agents simultaneously:

**Agent 1 (Stream 1 — AI):**
1. Add DB fields to Lead (aiScore, followUpAction, followUpDueDate, followUpMessage)
2. Build `/api/ai/score-leads` background job
3. Add `LeadActivity` table for tracking
4. Build `/api/leads/follow-ups-due` and follow-up creation endpoints
5. Add optimization suggestions API
6. Deploy Stream 1

**Agent 2 (Stream 2 — UX):**
1. Refine responsive layouts (mobile breakpoints)
2. Build Recharts dashboard visualizations
3. Implement bulk lead actions UI
4. Add advanced filter sidebar
5. Add keyboard shortcuts
6. Deploy Stream 2

**Agent 3 (Stream 3 — Scope):**
1. Update MetaAdAccount to support multiple per org
2. Build org/account switcher UI
3. Build team invite flow
4. Implement activity log
5. Build Meta API sync job
6. Build reporting/export utilities
7. Deploy Stream 3

---

## Rollout Strategy

- **Phase 0 deployment:** Single release
- **Phase 1 deployment:** Three independent releases (agents merge simultaneously or stagger)
- **Backwards compatibility:** Phase 0 changes are breaking (single-user → multi-tenant), existing users get default org auto-assigned

---

## Success Criteria

**Phase 0:**
- All existing data migrated safely
- Auth works for multi-tenant
- No data leaks between orgs

**Phase 1:**
- Stream 1: Leads sorted by AI score, follow-ups autogenerated
- Stream 2: Dashboard responsive on mobile, charts load quickly
- Stream 3: Orgs can manage multiple accounts, teams can be invited, reports export correctly

---

## Testing Strategy

**Phase 0:**
- Unit tests for JWT middleware
- Integration tests for auth endpoints (register, login, multi-org)
- Data migration scripts tested on sample data

**Phase 1:**
- Stream 1: Unit tests for scoring algorithm, integration tests for endpoints
- Stream 2: Visual regression tests for responsive layouts, performance benchmarks on chart rendering
- Stream 3: Integration tests for invite flow, Meta API mock tests

---

## Open Questions / Future Work

- Tag system for leads (mentioned in bulk actions, deferred to Phase 2)
- Saved filter profiles (deferred to Phase 2)
- Advanced reporting with custom date ranges (Phase 2)
- Slack/HubSpot integrations (listed in `APIIntegration` table for future use)
- Billing & subscription tiers (if SaaS multi-tenant)

