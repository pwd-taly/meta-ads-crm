# Phase 2.2: Email/SMS/Messaging - Design Specification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans (recommended) to implement this plan task-by-task.

**Goal:** Enable multi-channel messaging (email, SMS, WhatsApp) for follow-ups, campaigns, and notifications with template support, scheduling, and delivery tracking.

**Architecture:** Queue-based message delivery using existing scheduler pattern. Messages stored in database with status tracking. Integration with SendGrid (email), Twilio (SMS), and Meta API (WhatsApp). Support for variable substitution in templates.

**Tech Stack:** SendGrid (email), Twilio (SMS), Meta WhatsApp Business API, database-backed queuing, existing Next.js scheduler

---

## Context & Constraints

**Existing Foundation:**
- Lead model has followUpAction, followUpDueDate, followUpMessage fields
- MetaAdAccount stores WhatsApp credentials and templates
- Job scheduler runs hourly (scoring) and 6-hourly (meta-sync)
- Multi-tenancy with orgId scoping throughout
- Single-server deployment

**Scope:** Email + SMS + WhatsApp messaging only (not chat/conversations)

---

## System Architecture

### Data Model Extensions

**New Models:**

```
MessageTemplate
├── id (UUID)
├── orgId (required for multi-tenancy)
├── name (template name)
├── channel (email | sms | whatsapp)
├── subject (email only)
├── body (template with {{variables}})
├── variables (JSON: required and optional variables)
├── createdBy (userId)
├── createdAt, updatedAt
└── indexes: (orgId, channel), (orgId, createdAt)

MessageQueue
├── id (UUID)
├── orgId (required)
├── leadId (which lead to send to)
├── channel (email | sms | whatsapp)
├── templateId (reference to template)
├── recipientEmail/Phone
├── subject (for email)
├── body (resolved message with variables)
├── scheduledFor (DateTime or NULL for immediate)
├── sentAt (NULL until sent)
├── status (pending | sending | sent | failed | bounced)
├── deliveryStatus (for email: delivered/bounced/complained)
├── retryCount (0-3)
├── failureReason (error message)
├── externalId (SendGrid/Twilio message ID)
├── createdAt, updatedAt
└── indexes: (orgId, status), (orgId, scheduledFor), (leadId, channel)

MessageLog (audit trail)
├── id (UUID)
├── queueId (reference)
├── orgId
├── status (sent | failed | bounced)
├── sentAt
├── metadata (JSON: provider response, bounce reason, etc)
└── timestamp (created)
```

### Message Flow

```
Lead created with followUpAction=email
├── API endpoint or job scheduler detects due follow-ups
├── Looks up MessageTemplate (default or custom)
├── Creates MessageQueue entry with status=pending
├── Job scheduler runs hourly:
│   ├── Finds all pending messages with scheduledFor <= now
│   ├── Retrieves template and resolves variables
│   ├── Calls appropriate provider API
│   ├── Updates status to sent/failed
│   ├── On failure: increments retryCount, reschedules if < 3
│   ├── Creates MessageLog entry
│   └── Increments metrics (messages_sent_total, etc)
└── Webhook from provider (SendGrid/Twilio)
    ├── Updates MessageQueue with delivery status
    ├── Creates MessageLog entry
    └── Creates LeadActivity record for audit trail
```

### Provider Integration

**SendGrid (Email):**
- Endpoint: POST https://api.sendgrid.com/v3/mail/send
- Auth: API key in environment variable
- Features: Templates, tracking, bounce handling
- Rate limit: 100 emails/second

**Twilio (SMS):**
- Endpoint: POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
- Auth: Account SID + Auth Token
- Features: Delivery status, retry logic
- Rate limit: Based on account tier (typically 1000+/minute)

**Meta WhatsApp API:**
- Already integrated via metaAccessToken in MetaAdAccount
- Endpoint: POST https://graph.instagram.com/v18.0/{PhoneNumberId}/messages
- Uses existing credentials (no new auth needed)
- Features: Template-based messages, delivery confirmation
- Rate limit: Based on quality rating (typically 1000/day)

---

## Features

### 1. Message Templates

**What:** Store reusable message templates per organization and channel

**Who uses it:** Admin creates templates, system uses them for follow-ups

**Variables Supported:**
- {{firstName}}, {{lastName}}, {{fullName}} — from lead
- {{campaignName}}, {{adName}} — from campaign
- {{orgName}} — from organization
- {{linkUrl}} — custom URL injection
- {{date:YYYY-MM-DD}}, {{time:HH:mm}} — current date/time

**Example templates:**
```
Email:
  Subject: "Your {{campaignName}} - Next Steps"
  Body: "Hi {{firstName}}, thanks for your interest in {{campaignName}}.
         Here are the next steps: {{linkUrl}}"

SMS:
  "Hi {{firstName}}, thanks for interest in {{campaignName}}.
   Learn more: {{linkUrl}}"

WhatsApp:
  Uses template message flow (separate from custom messages)
```

### 2. Scheduled Delivery

**What:** Schedule messages to send at specific times

**Use cases:**
- Send follow-up email 24 hours after lead capture
- Send SMS reminder 1 hour before booking
- Send WhatsApp during business hours only

**Implementation:**
- leadFollowUpDueDate determines when to send
- Job scheduler checks at hourly intervals
- Database query: `status=pending AND scheduledFor <= now() LIMIT 100`

### 3. Delivery Tracking

**What:** Monitor message delivery status

**Status flow:**
```
pending → sending → sent (success)
              ↓
           failed → retry → sent
                    ↓
                  max retries exceeded → failed (permanent)
```

**For Email:**
- SendGrid webhook updates delivery status
- Tracks: sent, delivered, bounced, complained, dropped

**For SMS:**
- Twilio webhook updates delivery status
- Tracks: sent, queued, failed, delivered, undelivered

**For WhatsApp:**
- Meta webhook provides delivery confirmation
- Tracks: sent, delivered, read

### 4. Metrics

**New metrics (for observability stack):**
- `messages_sent_total` — Counter by channel (email, sms, whatsapp)
- `messages_failed_total` — Counter by channel
- `messages_delivery_rate` — Gauge (sent/total ratio)
- `messages_queue_depth` — Gauge (pending message count)
- `message_send_duration_seconds` — Histogram (time to send)
- `provider_api_errors_total` — Counter by provider

### 5. Error Handling & Retries

**Transient Errors (retry up to 3 times):**
- Network timeout
- Rate limit (429)
- Temporary provider outage (5xx)
- Strategy: Exponential backoff (1 min, 5 min, 15 min)

**Permanent Errors (no retry):**
- Invalid email/phone (4xx from provider)
- Invalid template
- Auth failure
- Action: Mark failed, log reason, create alert

---

## API Endpoints

### Message Template Management

```
POST /api/organizations/[orgId]/message-templates
GET /api/organizations/[orgId]/message-templates
GET /api/organizations/[orgId]/message-templates/[templateId]
PUT /api/organizations/[orgId]/message-templates/[templateId]
DELETE /api/organizations/[orgId]/message-templates/[templateId]
```

### Sending Messages

```
POST /api/leads/[leadId]/send-message
  {
    channel: "email" | "sms" | "whatsapp",
    templateId: "...", // or custom message
    customMessage?: "...",
    scheduledFor?: DateTime, // null = immediate
    variables?: { custom: "overrides" }
  }

POST /api/campaigns/[campaignId]/send-campaign-message
  {
    channel: "email" | "sms" | "whatsapp",
    templateId: "...",
    recipientFilter: { status: ["new", "contacted"], ... }
  }
```

### Message Status & History

```
GET /api/leads/[leadId]/message-history
  returns: [ { channel, status, sentAt, template, deliveryStatus } ]

GET /api/organizations/[orgId]/messages/queue
  returns: pending messages for that org
```

---

## Implementation Scope

**What Gets Built:**

1. **Database Schema Updates**
   - MessageTemplate table
   - MessageQueue table
   - MessageLog table
   - Webhooks for delivery status

2. **Core Services (lib/messaging/)**
   - sendgrid-client.ts — SendGrid integration
   - twilio-client.ts — Twilio integration
   - meta-whatsapp-client.ts — Meta WhatsApp API
   - template-resolver.ts — Variable substitution
   - message-queue-service.ts — Queue management

3. **Job Scheduler Enhancement**
   - New messageDeliveryJob in schedule-jobs.ts
   - Runs every 5 minutes to process queue
   - Handles retries and failure tracking

4. **API Endpoints**
   - Template CRUD operations
   - Message sending and scheduling
   - Status checking and history

5. **Webhook Handlers**
   - POST /api/webhooks/sendgrid (delivery status)
   - POST /api/webhooks/twilio (SMS status)
   - POST /api/webhooks/meta-whatsapp (delivery status)

6. **Metrics & Logging**
   - New Prometheus metrics for message delivery
   - Structured logging for all sends/failures
   - Message delivery audit trail

**What's NOT in scope:**
- Bulk messaging campaigns (out of scope for Phase 2.2)
- Two-way messaging/conversations
- Rich media attachments
- SMS shortcodes or sender ID management

---

## Configuration

**Environment Variables:**

```
# Email (SendGrid)
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=noreply@company.com
SENDGRID_FROM_NAME=Meta Ads CRM

# SMS (Twilio)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Meta WhatsApp (already configured via MetaAdAccount)
# Uses existing metaAccessToken and metaPhoneNumberId

# Messaging Configuration
MESSAGE_SEND_BATCH_SIZE=100
MESSAGE_RETRY_MAX_ATTEMPTS=3
MESSAGE_RETRY_BACKOFF_MULTIPLIER=2 # 1 min, 5 min, 15 min
```

**Webhook Security:**
- SendGrid: API key in authorization header
- Twilio: Validate request signature with auth token
- Meta: Validate webhook token matches WHATSAPP_WEBHOOK_TOKEN

---

## Testing Strategy

**Unit Tests:**
- Template variable resolution
- Message status transitions
- Provider client error handling

**Integration Tests:**
- Full message flow (create → queue → send → webhook)
- Retry logic with max attempts
- Multi-tenant isolation

**Manual Testing:**
- Send test email/SMS to verified numbers
- Verify delivery status via provider dashboards
- Test webhook delivery status updates

---

## Success Criteria

✅ Send emails via SendGrid with template variables
✅ Send SMS via Twilio with recipient validation
✅ Send WhatsApp messages via Meta API
✅ Schedule messages for future delivery
✅ Track delivery status with provider webhooks
✅ Retry failed messages up to 3 times with backoff
✅ Log all message activity for audit trail
✅ Multi-tenant isolation (orgId scoping)
✅ Metrics exported to Prometheus
✅ Graceful error handling (no silent failures)

---

## Known TODOs (Phase 2.3+)

- Bulk campaign messaging (broadcast to multiple leads)
- Rich email templates (HTML with images)
- SMS shortcodes and sender ID options
- WhatsApp media message support (images, documents)
- Message analytics dashboard (open rates, clicks)
- A/B testing support for templates
- Compliance: GDPR consent tracking, unsubscribe links
