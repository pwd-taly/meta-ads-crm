# Phase 2.2: Email/SMS/Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement multi-channel messaging (email, SMS, WhatsApp) with template support, queue-based delivery, retry logic, and delivery tracking via webhooks.

**Architecture:** Queue-based message delivery decouples sending from delivery confirmation. Templates store message content with variable substitution. Job scheduler processes pending messages every 5 minutes with transient/permanent error handling. Webhooks from providers update delivery status asynchronously. All operations scoped to orgId for multi-tenancy.

**Tech Stack:** SendGrid (email), Twilio (SMS), Meta WhatsApp Business API, Prisma ORM, Next.js API routes, Express middleware pattern

---

## Task 1: Add MessageTemplate, MessageQueue, MessageLog Models to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add MessageTemplate model**

Open `prisma/schema.prisma` and add after the Lead model:

```prisma
model MessageTemplate {
  id        String   @id @default(cuid())
  orgId     String
  name      String
  channel   String   // "email" | "sms" | "whatsapp"
  subject   String?  // email only
  body      String
  variables Json?    // { required: ["firstName"], optional: ["linkUrl"] }
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  creator      User         @relation(fields: [createdBy], references: [id])
  messages     MessageQueue[]

  @@index([orgId, channel])
  @@index([orgId, createdAt])
}
```

- [ ] **Step 2: Add MessageQueue model**

Add after MessageTemplate:

```prisma
model MessageQueue {
  id               String   @id @default(cuid())
  orgId            String
  leadId           String
  channel          String   // "email" | "sms" | "whatsapp"
  templateId       String?
  recipientEmail   String?
  recipientPhone   String?
  subject          String?  // for email
  body             String
  scheduledFor     DateTime?
  sentAt           DateTime?
  status           String   // "pending" | "sending" | "sent" | "failed" | "bounced"
  deliveryStatus   String?  // "delivered" | "bounced" | "complained" | "dropped" (email), "queued" | "failed" | "undelivered" (sms)
  retryCount       Int      @default(0)
  failureReason    String?
  externalId       String?  // SendGrid/Twilio message ID
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  organization Organization     @relation(fields: [orgId], references: [id], onDelete: Cascade)
  lead         Lead             @relation(fields: [leadId], references: [id], onDelete: Cascade)
  template     MessageTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  logs         MessageLog[]

  @@index([orgId, status])
  @@index([orgId, scheduledFor])
  @@index([leadId, channel])
}
```

- [ ] **Step 3: Add MessageLog model**

Add after MessageQueue:

```prisma
model MessageLog {
  id        String   @id @default(cuid())
  queueId   String
  orgId     String
  status    String   // "sent" | "failed" | "bounced"
  sentAt    DateTime?
  metadata  Json?    // { providerResponse, bounceReason, etc }
  timestamp DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  queue        MessageQueue @relation(fields: [queueId], references: [id], onDelete: Cascade)

  @@index([orgId, timestamp])
  @@index([queueId])
}
```

- [ ] **Step 4: Update Organization and User relations**

Find the `model Organization` section and add these relations (if not already present):

```prisma
  messageTemplates MessageTemplate[]
  messages         MessageQueue[]
  messageLogs      MessageLog[]
```

Find the `model User` section and add:

```prisma
  messageTemplates MessageTemplate[]
```

Find the `model Lead` section and add:

```prisma
  messages MessageQueue[]
```

- [ ] **Step 5: Run Prisma migrations**

```bash
npx prisma migrate dev --name add_messaging_models
```

Expected: Migration created and applied successfully.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add messaging models (MessageTemplate, MessageQueue, MessageLog)"
```

---

## Task 2: Create SendGrid Email Client

**Files:**
- Create: `lib/messaging/sendgrid-client.ts`
- Create: `tests/messaging-providers.test.ts` (partial)

- [ ] **Step 1: Write test for SendGrid client**

Create `tests/messaging-providers.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SendGridClient } from '@/lib/messaging/sendgrid-client';

describe('SendGridClient', () => {
  let client: SendGridClient;

  beforeEach(() => {
    client = new SendGridClient({
      apiKey: 'test-key',
      fromEmail: 'noreply@test.com',
      fromName: 'Test App',
    });
  });

  it('should validate email address before sending', async () => {
    const result = await client.send({
      to: 'invalid-email',
      subject: 'Test',
      body: 'Test body',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid email');
  });

  it('should format message correctly for SendGrid API', async () => {
    const sendSpy = vi.spyOn(client as any, 'callSendGridApi');
    sendSpy.mockResolvedValueOnce({ id: 'msg-123' });

    await client.send({
      to: 'user@example.com',
      subject: 'Test Subject',
      body: 'Test body',
    });

    expect(sendSpy).toHaveBeenCalledWith({
      personalizations: [{ to: [{ email: 'user@example.com' }] }],
      from: { email: 'noreply@test.com', name: 'Test App' },
      subject: 'Test Subject',
      content: [{ type: 'text/plain', value: 'Test body' }],
    });
  });

  it('should return external message ID on success', async () => {
    vi.spyOn(client as any, 'callSendGridApi').mockResolvedValueOnce({ id: 'msg-456' });

    const result = await client.send({
      to: 'user@example.com',
      subject: 'Test',
      body: 'Body',
    });

    expect(result.success).toBe(true);
    expect(result.externalId).toBe('msg-456');
  });

  it('should handle API errors gracefully', async () => {
    vi.spyOn(client as any, 'callSendGridApi').mockRejectedValueOnce(
      new Error('API Error: 401 Unauthorized')
    );

    const result = await client.send({
      to: 'user@example.com',
      subject: 'Test',
      body: 'Body',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('API Error');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/messaging-providers.test.ts
```

Expected: FAIL with "SendGridClient not found" or "callSendGridApi not found"

- [ ] **Step 3: Create SendGrid client implementation**

Create `lib/messaging/sendgrid-client.ts`:

```typescript
import { logger } from '@/lib/logger';

interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

interface SendMessageOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

interface SendResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export class SendGridClient {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor(config: SendGridConfig) {
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
  }

  async send(options: SendMessageOptions): Promise<SendResult> {
    // Validate email
    if (!this.isValidEmail(options.to)) {
      return { success: false, error: 'Invalid email address' };
    }

    try {
      const response = await this.callSendGridApi({
        personalizations: [
          {
            to: [{ email: options.to }],
          },
        ],
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: options.subject,
        content: [
          {
            type: options.html ? 'text/html' : 'text/plain',
            value: options.html || options.body,
          },
        ],
      });

      logger.info('SendGrid email sent', {
        to: options.to,
        externalId: response.id,
      });

      return {
        success: true,
        externalId: response.id,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('SendGrid send failed', { to: options.to, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  private async callSendGridApi(payload: Record<string, unknown>): Promise<{ id: string }> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`SendGrid API error: ${response.status} ${text}`);
    }

    // SendGrid returns 202 with no body, generate ID from timestamp
    const externalId = `sg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return { id: externalId };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/messaging-providers.test.ts
```

Expected: PASS (all tests should pass)

- [ ] **Step 5: Commit**

```bash
git add lib/messaging/sendgrid-client.ts tests/messaging-providers.test.ts
git commit -m "feat: implement SendGrid email client with validation and error handling"
```

---

## Task 3: Create Twilio SMS Client

**Files:**
- Create: `lib/messaging/twilio-client.ts`
- Modify: `tests/messaging-providers.test.ts`

- [ ] **Step 1: Add Twilio tests to messaging-providers.test.ts**

Add to `tests/messaging-providers.test.ts` after the SendGridClient tests:

```typescript
import { TwilioClient } from '@/lib/messaging/twilio-client';

describe('TwilioClient', () => {
  let client: TwilioClient;

  beforeEach(() => {
    client = new TwilioClient({
      accountSid: 'test-sid',
      authToken: 'test-token',
      fromNumber: '+1234567890',
    });
  });

  it('should validate phone number before sending', async () => {
    const result = await client.send({
      to: 'invalid',
      body: 'Test message',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid phone');
  });

  it('should format message correctly for Twilio API', async () => {
    const sendSpy = vi.spyOn(client as any, 'callTwilioApi');
    sendSpy.mockResolvedValueOnce({ sid: 'sms-123' });

    await client.send({
      to: '+1987654321',
      body: 'Test SMS',
    });

    expect(sendSpy).toHaveBeenCalled();
    const callArgs = sendSpy.mock.calls[0][0];
    expect(callArgs).toContain('To=%2B1987654321');
    expect(callArgs).toContain('From=%2B1234567890');
    expect(callArgs).toContain('Body=Test+SMS');
  });

  it('should return external message ID on success', async () => {
    vi.spyOn(client as any, 'callTwilioApi').mockResolvedValueOnce({ sid: 'sms-456' });

    const result = await client.send({
      to: '+1987654321',
      body: 'Test message',
    });

    expect(result.success).toBe(true);
    expect(result.externalId).toBe('sms-456');
  });

  it('should handle API errors gracefully', async () => {
    vi.spyOn(client as any, 'callTwilioApi').mockRejectedValueOnce(
      new Error('Twilio API error: 401')
    );

    const result = await client.send({
      to: '+1987654321',
      body: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('API error');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/messaging-providers.test.ts
```

Expected: FAIL with "TwilioClient not found"

- [ ] **Step 3: Create Twilio client implementation**

Create `lib/messaging/twilio-client.ts`:

```typescript
import { logger } from '@/lib/logger';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

interface SendSMSOptions {
  to: string;
  body: string;
}

interface SendResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export class TwilioClient {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(config: TwilioConfig) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.fromNumber = config.fromNumber;
  }

  async send(options: SendSMSOptions): Promise<SendResult> {
    // Validate phone number (basic E.164 format)
    if (!this.isValidPhone(options.to)) {
      return { success: false, error: 'Invalid phone number' };
    }

    try {
      const response = await this.callTwilioApi(
        `To=${encodeURIComponent(options.to)}&From=${encodeURIComponent(this.fromNumber)}&Body=${encodeURIComponent(options.body)}`
      );

      logger.info('Twilio SMS sent', {
        to: options.to,
        externalId: response.sid,
      });

      return {
        success: true,
        externalId: response.sid,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Twilio send failed', { to: options.to, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  private async callTwilioApi(body: string): Promise<{ sid: string }> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Twilio API error: ${response.status} ${text}`);
    }

    const data = (await response.json()) as { sid?: string };
    if (!data.sid) {
      throw new Error('Twilio API error: No message SID returned');
    }

    return { sid: data.sid };
  }

  private isValidPhone(phone: string): boolean {
    // E.164 format: +1234567890 (+ followed by 1-15 digits)
    const phoneRegex = /^\+\d{1,15}$/;
    return phoneRegex.test(phone.trim());
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/messaging-providers.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/messaging/twilio-client.ts
git commit -m "feat: implement Twilio SMS client with phone validation and error handling"
```

---

## Task 4: Create Meta WhatsApp Client

**Files:**
- Create: `lib/messaging/meta-whatsapp-client.ts`
- Modify: `tests/messaging-providers.test.ts`

- [ ] **Step 1: Add Meta WhatsApp tests**

Add to `tests/messaging-providers.test.ts`:

```typescript
import { MetaWhatsAppClient } from '@/lib/messaging/meta-whatsapp-client';

describe('MetaWhatsAppClient', () => {
  let client: MetaWhatsAppClient;

  beforeEach(() => {
    client = new MetaWhatsAppClient({
      accessToken: 'test-token',
      phoneNumberId: 'test-phone-id',
    });
  });

  it('should validate phone number before sending', async () => {
    const result = await client.send({
      to: 'invalid',
      body: 'Test message',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid phone');
  });

  it('should format message for Meta API', async () => {
    const sendSpy = vi.spyOn(client as any, 'callMetaApi');
    sendSpy.mockResolvedValueOnce({ messages: [{ id: 'wamsg-123' }] });

    await client.send({
      to: '+1987654321',
      body: 'Test WhatsApp',
    });

    expect(sendSpy).toHaveBeenCalled();
  });

  it('should return external message ID on success', async () => {
    vi.spyOn(client as any, 'callMetaApi').mockResolvedValueOnce({
      messages: [{ id: 'wamsg-456' }],
    });

    const result = await client.send({
      to: '+1987654321',
      body: 'Test',
    });

    expect(result.success).toBe(true);
    expect(result.externalId).toBe('wamsg-456');
  });

  it('should handle API errors gracefully', async () => {
    vi.spyOn(client as any, 'callMetaApi').mockRejectedValueOnce(
      new Error('Meta API error: 401')
    );

    const result = await client.send({
      to: '+1987654321',
      body: 'Test',
    });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/messaging-providers.test.ts
```

Expected: FAIL with "MetaWhatsAppClient not found"

- [ ] **Step 3: Create Meta WhatsApp client**

Create `lib/messaging/meta-whatsapp-client.ts`:

```typescript
import { logger } from '@/lib/logger';

interface MetaConfig {
  accessToken: string;
  phoneNumberId: string;
}

interface SendWhatsAppOptions {
  to: string;
  body: string;
}

interface SendResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export class MetaWhatsAppClient {
  private accessToken: string;
  private phoneNumberId: string;

  constructor(config: MetaConfig) {
    this.accessToken = config.accessToken;
    this.phoneNumberId = config.phoneNumberId;
  }

  async send(options: SendWhatsAppOptions): Promise<SendResult> {
    // Validate phone number
    if (!this.isValidPhone(options.to)) {
      return { success: false, error: 'Invalid phone number' };
    }

    try {
      const response = await this.callMetaApi({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: options.to.replace(/\D/g, ''), // Remove non-digits for Meta API
        type: 'text',
        text: {
          preview_url: false,
          body: options.body,
        },
      });

      const messageId = response.messages[0]?.id;
      if (!messageId) {
        throw new Error('No message ID in Meta response');
      }

      logger.info('Meta WhatsApp message sent', {
        to: options.to,
        externalId: messageId,
      });

      return {
        success: true,
        externalId: messageId,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Meta WhatsApp send failed', { to: options.to, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  private async callMetaApi(payload: Record<string, unknown>): Promise<{
    messages: Array<{ id: string }>;
  }> {
    const url = `https://graph.instagram.com/v18.0/${this.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Meta API error: ${response.status} ${text}`);
    }

    return response.json();
  }

  private isValidPhone(phone: string): boolean {
    // E.164 format: +1234567890
    const phoneRegex = /^\+\d{1,15}$/;
    return phoneRegex.test(phone.trim());
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/messaging-providers.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/messaging/meta-whatsapp-client.ts
git commit -m "feat: implement Meta WhatsApp client with phone validation"
```

---

## Task 5: Create Template Variable Resolver

**Files:**
- Create: `lib/messaging/template-resolver.ts`
- Create: `tests/messaging-templates.test.ts`

- [ ] **Step 1: Write tests for template resolver**

Create `tests/messaging-templates.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { resolveTemplateVariables } from '@/lib/messaging/template-resolver';

describe('resolveTemplateVariables', () => {
  it('should replace lead variables', () => {
    const template = 'Hi {{firstName}}, thanks for your interest!';
    const result = resolveTemplateVariables(template, {
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(result).toBe('Hi John, thanks for your interest!');
  });

  it('should replace campaign variables', () => {
    const template = 'Check out {{campaignName}} - {{adName}}';
    const result = resolveTemplateVariables(template, {
      campaignName: 'Summer Sale',
      adName: 'Ad 1',
    });

    expect(result).toBe('Check out Summer Sale - Ad 1');
  });

  it('should replace organization variable', () => {
    const template = 'From {{orgName}} team';
    const result = resolveTemplateVariables(template, {
      orgName: 'Acme Corp',
    });

    expect(result).toBe('From Acme Corp team');
  });

  it('should replace URL variables', () => {
    const template = 'Click here: {{linkUrl}}';
    const result = resolveTemplateVariables(template, {
      linkUrl: 'https://example.com',
    });

    expect(result).toBe('Click here: https://example.com');
  });

  it('should replace date variable with default format', () => {
    const template = 'Today is {{date:YYYY-MM-DD}}';
    const result = resolveTemplateVariables(template, {});

    expect(result).toMatch(/Today is \d{4}-\d{2}-\d{2}/);
  });

  it('should replace time variable', () => {
    const template = 'Current time: {{time:HH:mm}}';
    const result = resolveTemplateVariables(template, {});

    expect(result).toMatch(/Current time: \d{2}:\d{2}/);
  });

  it('should handle fullName composite variable', () => {
    const template = 'Hello {{fullName}}!';
    const result = resolveTemplateVariables(template, {
      firstName: 'Jane',
      lastName: 'Smith',
    });

    expect(result).toBe('Hello Jane Smith!');
  });

  it('should leave unreplaced variables as-is if not provided', () => {
    const template = 'Hi {{firstName}}, {{unknownVar}} here';
    const result = resolveTemplateVariables(template, {
      firstName: 'John',
    });

    expect(result).toBe('Hi John, {{unknownVar}} here');
  });

  it('should handle multiple occurrences of same variable', () => {
    const template = '{{firstName}} {{firstName}}';
    const result = resolveTemplateVariables(template, {
      firstName: 'John',
    });

    expect(result).toBe('John John');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/messaging-templates.test.ts
```

Expected: FAIL with "resolveTemplateVariables not found"

- [ ] **Step 3: Create template resolver implementation**

Create `lib/messaging/template-resolver.ts`:

```typescript
interface TemplateVariables {
  [key: string]: string | undefined;
}

export function resolveTemplateVariables(
  template: string,
  variables: TemplateVariables
): string {
  let result = template;

  // Handle fullName composite (depends on firstName + lastName)
  if (variables.firstName || variables.lastName) {
    const fullName = `${variables.firstName || ''} ${variables.lastName || ''}`.trim();
    result = result.replace(/\{\{fullName\}\}/g, fullName);
  }

  // Handle date variables (e.g., {{date:YYYY-MM-DD}})
  result = result.replace(/\{\{date:([^\}]+)\}\}/g, (match, format) => {
    return formatDate(new Date(), format);
  });

  // Handle time variables (e.g., {{time:HH:mm}})
  result = result.replace(/\{\{time:([^\}]+)\}\}/g, (match, format) => {
    return formatTime(new Date(), format);
  });

  // Handle standard variables
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && key !== 'firstName' && key !== 'lastName') {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
  });

  // Handle firstName and lastName last (after fullName)
  if (variables.firstName) {
    result = result.replace(/\{\{firstName\}\}/g, variables.firstName);
  }
  if (variables.lastName) {
    result = result.replace(/\{\{lastName\}\}/g, variables.lastName);
  }

  return result;
}

function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day);
}

function formatTime(date: Date, format: string): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/messaging-templates.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/messaging/template-resolver.ts tests/messaging-templates.test.ts
git commit -m "feat: implement template variable resolver with date/time formatting"
```

---

## Task 6: Create Message Queue Service

**Files:**
- Create: `lib/messaging/message-queue-service.ts`
- Modify: `tests/messaging-queue.test.ts` (create with basic tests)

- [ ] **Step 1: Write test for message queue service**

Create `tests/messaging-queue.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageQueueService } from '@/lib/messaging/message-queue-service';
import { prisma } from '@/lib/prisma';

describe('MessageQueueService', () => {
  let service: MessageQueueService;

  beforeEach(() => {
    service = new MessageQueueService(prisma);
  });

  it('should create a pending message in the queue', async () => {
    const message = await service.enqueue({
      orgId: 'org-1',
      leadId: 'lead-1',
      channel: 'email',
      templateId: 'template-1',
      recipientEmail: 'user@example.com',
      subject: 'Test',
      body: 'Test body',
      scheduledFor: null,
    });

    expect(message.status).toBe('pending');
    expect(message.retryCount).toBe(0);
  });

  it('should schedule message for future delivery', async () => {
    const futureTime = new Date(Date.now() + 3600000); // 1 hour from now
    const message = await service.enqueue({
      orgId: 'org-1',
      leadId: 'lead-1',
      channel: 'sms',
      templateId: 'template-1',
      recipientPhone: '+1234567890',
      body: 'Test SMS',
      scheduledFor: futureTime,
    });

    expect(message.scheduledFor).toEqual(futureTime);
    expect(message.status).toBe('pending');
  });

  it('should find pending messages due for sending', async () => {
    const pastTime = new Date(Date.now() - 3600000);

    await service.enqueue({
      orgId: 'org-1',
      leadId: 'lead-1',
      channel: 'email',
      templateId: 'template-1',
      recipientEmail: 'user@example.com',
      subject: 'Old',
      body: 'Body',
      scheduledFor: pastTime,
    });

    const pending = await service.getPendingMessages('org-1', 100);
    expect(pending.length).toBeGreaterThan(0);
    expect(pending[0].status).toBe('pending');
  });

  it('should update message status to sent', async () => {
    const message = await service.enqueue({
      orgId: 'org-1',
      leadId: 'lead-1',
      channel: 'email',
      templateId: 'template-1',
      recipientEmail: 'user@example.com',
      subject: 'Test',
      body: 'Body',
      scheduledFor: null,
    });

    const updated = await service.updateStatus(message.id, 'sent', 'ext-123');
    expect(updated.status).toBe('sent');
    expect(updated.externalId).toBe('ext-123');
    expect(updated.sentAt).toBeTruthy();
  });

  it('should increment retry count on transient failure', async () => {
    const message = await service.enqueue({
      orgId: 'org-1',
      leadId: 'lead-1',
      channel: 'email',
      templateId: 'template-1',
      recipientEmail: 'user@example.com',
      subject: 'Test',
      body: 'Body',
      scheduledFor: null,
    });

    const retried = await service.retryMessage(message.id, 'Timeout');
    expect(retried.retryCount).toBe(1);
    expect(retried.failureReason).toBe('Timeout');
  });

  it('should mark as failed after max retries', async () => {
    const message = await service.enqueue({
      orgId: 'org-1',
      leadId: 'lead-1',
      channel: 'email',
      templateId: 'template-1',
      recipientEmail: 'user@example.com',
      subject: 'Test',
      body: 'Body',
      scheduledFor: null,
    });

    // Simulate 3 retries
    await service.retryMessage(message.id, 'Error 1');
    await service.retryMessage(message.id, 'Error 2');
    await service.retryMessage(message.id, 'Error 3');

    const failed = await service.markAsFailed(message.id, 'Max retries exceeded');
    expect(failed.status).toBe('failed');
    expect(failed.retryCount).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/messaging-queue.test.ts
```

Expected: FAIL with "MessageQueueService not found"

- [ ] **Step 3: Create message queue service**

Create `lib/messaging/message-queue-service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

interface EnqueueOptions {
  orgId: string;
  leadId: string;
  channel: 'email' | 'sms' | 'whatsapp';
  templateId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  body: string;
  scheduledFor: Date | null;
}

export class MessageQueueService {
  constructor(private prisma: PrismaClient) {}

  async enqueue(options: EnqueueOptions) {
    const message = await this.prisma.messageQueue.create({
      data: {
        orgId: options.orgId,
        leadId: options.leadId,
        channel: options.channel,
        templateId: options.templateId,
        recipientEmail: options.recipientEmail,
        recipientPhone: options.recipientPhone,
        subject: options.subject,
        body: options.body,
        scheduledFor: options.scheduledFor,
        status: 'pending',
        retryCount: 0,
      },
    });

    logger.info('Message enqueued', {
      messageId: message.id,
      orgId: options.orgId,
      channel: options.channel,
      leadId: options.leadId,
    });

    return message;
  }

  async getPendingMessages(orgId: string, batchSize: number) {
    const now = new Date();
    return this.prisma.messageQueue.findMany({
      where: {
        orgId,
        status: 'pending',
        scheduledFor: {
          lte: now,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: batchSize,
    });
  }

  async updateStatus(
    messageId: string,
    status: 'sent' | 'failed' | 'bounced',
    externalId?: string,
    deliveryStatus?: string
  ) {
    const message = await this.prisma.messageQueue.update({
      where: { id: messageId },
      data: {
        status,
        externalId: externalId || undefined,
        deliveryStatus: deliveryStatus || undefined,
        sentAt: status === 'sent' ? new Date() : undefined,
      },
    });

    logger.info('Message status updated', {
      messageId,
      status,
      externalId,
    });

    return message;
  }

  async retryMessage(messageId: string, failureReason: string) {
    const message = await this.prisma.messageQueue.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error(`Message ${messageId} not found`);
    }

    const newRetryCount = message.retryCount + 1;
    const maxAttempts = 3;

    // Calculate exponential backoff: 1 min, 5 min, 15 min
    const backoffMinutes = [1, 5, 15];
    const minutesToAdd = backoffMinutes[newRetryCount - 1] || 15;
    const newScheduledFor = new Date(Date.now() + minutesToAdd * 60000);

    const updated = await this.prisma.messageQueue.update({
      where: { id: messageId },
      data: {
        retryCount: newRetryCount,
        failureReason,
        scheduledFor: newRetryCount >= maxAttempts ? undefined : newScheduledFor,
        status: newRetryCount >= maxAttempts ? 'failed' : 'pending',
      },
    });

    logger.info('Message retry scheduled', {
      messageId,
      retryCount: newRetryCount,
      failureReason,
      newScheduledFor: newRetryCount < maxAttempts ? newScheduledFor : undefined,
    });

    return updated;
  }

  async markAsFailed(messageId: string, reason: string) {
    const message = await this.prisma.messageQueue.update({
      where: { id: messageId },
      data: {
        status: 'failed',
        failureReason: reason,
      },
    });

    logger.error('Message marked as failed', {
      messageId,
      reason,
    });

    return message;
  }

  async logDelivery(
    messageId: string,
    deliveryStatus: string,
    metadata?: Record<string, unknown>
  ) {
    const message = await this.prisma.messageQueue.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error(`Message ${messageId} not found`);
    }

    const log = await this.prisma.messageLog.create({
      data: {
        queueId: messageId,
        orgId: message.orgId,
        status: deliveryStatus as 'sent' | 'failed' | 'bounced',
        sentAt: new Date(),
        metadata,
      },
    });

    return log;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/messaging-queue.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/messaging/message-queue-service.ts tests/messaging-queue.test.ts
git commit -m "feat: implement message queue service with retry logic and delivery logging"
```

---

## Task 7: Add Messaging Metrics to lib/metrics.ts

**Files:**
- Modify: `lib/metrics.ts`

- [ ] **Step 1: Read existing metrics file to understand structure**

```bash
head -50 lib/metrics.ts
```

- [ ] **Step 2: Add messaging metrics to exports section**

Find the section in `lib/metrics.ts` where metrics are defined and add these after the existing metrics:

```typescript
// Messaging Metrics
export const messagessentTotal = new prometheus.Counter({
  name: 'messages_sent_total',
  help: 'Total messages sent by channel',
  labelNames: ['channel', 'org_id'],
});

export const messagesFailedTotal = new prometheus.Counter({
  name: 'messages_failed_total',
  help: 'Total messages that failed to send',
  labelNames: ['channel', 'reason', 'org_id'],
});

export const messagesDeliveryRate = new prometheus.Gauge({
  name: 'messages_delivery_rate',
  help: 'Message delivery success rate',
  labelNames: ['channel', 'org_id'],
});

export const messagesQueueDepth = new prometheus.Gauge({
  name: 'messages_queue_depth',
  help: 'Number of pending messages in queue',
  labelNames: ['channel', 'org_id'],
});

export const messageSendDurationSeconds = new prometheus.Histogram({
  name: 'message_send_duration_seconds',
  help: 'Time taken to send a message',
  labelNames: ['channel', 'org_id'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const providerApiErrorsTotal = new prometheus.Counter({
  name: 'provider_api_errors_total',
  help: 'Total API errors from external messaging providers',
  labelNames: ['provider', 'error_type', 'org_id'],
});
```

- [ ] **Step 3: Commit**

```bash
git add lib/metrics.ts
git commit -m "feat: add messaging metrics (sent, failed, queue depth, duration, provider errors)"
```

---

## Task 8: Create Template CRUD API Endpoints

**Files:**
- Create: `app/api/organizations/[orgId]/message-templates/route.ts`
- Create: `app/api/organizations/[orgId]/message-templates/[templateId]/route.ts`

- [ ] **Step 1: Create templates list and create endpoint**

Create `app/api/organizations/[orgId]/message-templates/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const auth = await requireAuth(request);
    const orgId = params.orgId;

    // Verify user is member of organization
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_orgId: {
          userId: auth.userId,
          orgId,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    const templates = await prisma.messageTemplate.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        channel: true,
        subject: true,
        createdAt: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(templates);
  } catch (error) {
    logger.error('Failed to list templates', { error });
    return NextResponse.json(
      { error: 'Failed to list templates' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const auth = await requireAuth(request);
    await requireRole(request, ['admin', 'owner']);
    const orgId = params.orgId;

    const body = await request.json();
    const { name, channel, subject, body: templateBody, variables } = body;

    // Validate input
    if (!name || !channel || !templateBody) {
      return NextResponse.json(
        { error: 'Missing required fields: name, channel, body' },
        { status: 400 }
      );
    }

    if (!['email', 'sms', 'whatsapp'].includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel' },
        { status: 400 }
      );
    }

    if (channel === 'email' && !subject) {
      return NextResponse.json(
        { error: 'Email templates require a subject' },
        { status: 400 }
      );
    }

    const template = await prisma.messageTemplate.create({
      data: {
        orgId,
        name,
        channel,
        subject: channel === 'email' ? subject : null,
        body: templateBody,
        variables,
        createdBy: auth.userId,
      },
    });

    logger.info('Template created', {
      templateId: template.id,
      orgId,
      channel,
      createdBy: auth.userId,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    logger.error('Failed to create template', { error });
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create individual template operations endpoint**

Create `app/api/organizations/[orgId]/message-templates/[templateId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string; templateId: string } }
) {
  try {
    const auth = await requireAuth(request);
    const { orgId, templateId } = params;

    const template = await prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || template.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    logger.error('Failed to get template', { error });
    return NextResponse.json(
      { error: 'Failed to get template' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { orgId: string; templateId: string } }
) {
  try {
    const auth = await requireAuth(request);
    await requireRole(request, ['admin', 'owner']);
    const { orgId, templateId } = params;

    const body = await request.json();
    const { name, subject, body: templateBody, variables } = body;

    const template = await prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || template.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.messageTemplate.update({
      where: { id: templateId },
      data: {
        name: name || template.name,
        subject: subject !== undefined ? subject : template.subject,
        body: templateBody || template.body,
        variables: variables || template.variables,
      },
    });

    logger.info('Template updated', {
      templateId,
      orgId,
      updatedBy: auth.userId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('Failed to update template', { error });
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgId: string; templateId: string } }
) {
  try {
    const auth = await requireAuth(request);
    await requireRole(request, ['admin', 'owner']);
    const { orgId, templateId } = params;

    const template = await prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || template.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    await prisma.messageTemplate.delete({
      where: { id: templateId },
    });

    logger.info('Template deleted', {
      templateId,
      orgId,
      deletedBy: auth.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete template', { error });
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/organizations/[orgId]/message-templates/
git commit -m "feat: add message template CRUD API endpoints with auth and validation"
```

---

## Task 9: Create Send Message Endpoint for Individual Leads

**Files:**
- Create: `app/api/leads/[leadId]/send-message/route.ts`

- [ ] **Step 1: Implement send message endpoint**

Create `app/api/leads/[leadId]/send-message/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { MessageQueueService } from '@/lib/messaging/message-queue-service';
import { resolveTemplateVariables } from '@/lib/messaging/template-resolver';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const auth = await requireAuth(request);
    const leadId = params.leadId;
    const body = await request.json();

    const { channel, templateId, customMessage, scheduledFor, variables } = body;

    // Validate input
    if (!channel || !['email', 'sms', 'whatsapp'].includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel' },
        { status: 400 }
      );
    }

    // Get lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { organization: true, campaign: true },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Verify user is member of lead's organization
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_orgId: {
          userId: auth.userId,
          orgId: lead.orgId,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    let messageBody = customMessage;
    let messageSubject: string | undefined;
    let recipientEmail: string | undefined;
    let recipientPhone: string | undefined;

    // Get template if provided
    if (templateId) {
      const template = await prisma.messageTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template || template.orgId !== lead.orgId) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      // Resolve template variables
      const templateVars = {
        firstName: lead.firstName,
        lastName: lead.lastName,
        fullName: `${lead.firstName} ${lead.lastName}`.trim(),
        campaignName: lead.campaign?.name,
        adName: lead.campaign?.adName,
        orgName: lead.organization.name,
        ...variables,
      };

      messageBody = resolveTemplateVariables(template.body, templateVars);
      messageSubject = template.subject
        ? resolveTemplateVariables(template.subject, templateVars)
        : undefined;
    }

    // Validate recipient contact info
    if (channel === 'email' && !lead.email) {
      return NextResponse.json(
        { error: 'Lead has no email address' },
        { status: 400 }
      );
    }
    if ((channel === 'sms' || channel === 'whatsapp') && !lead.phoneNumber) {
      return NextResponse.json(
        { error: 'Lead has no phone number' },
        { status: 400 }
      );
    }

    recipientEmail = channel === 'email' ? lead.email : undefined;
    recipientPhone = channel !== 'email' ? lead.phoneNumber : undefined;

    // Enqueue message
    const queueService = new MessageQueueService(prisma);
    const message = await queueService.enqueue({
      orgId: lead.orgId,
      leadId,
      channel: channel as 'email' | 'sms' | 'whatsapp',
      templateId,
      recipientEmail,
      recipientPhone,
      subject: messageSubject,
      body: messageBody,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    });

    logger.info('Message sent to lead', {
      messageId: message.id,
      leadId,
      channel,
      scheduled: !!scheduledFor,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    logger.error('Failed to send message', { error });
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/leads/[leadId]/send-message/route.ts
git commit -m "feat: add send message endpoint for individual leads with template resolution"
```

---

## Task 10: Create Campaign Broadcast Endpoint

**Files:**
- Create: `app/api/campaigns/[campaignId]/send-campaign-message/route.ts`

- [ ] **Step 1: Implement campaign message broadcast**

Create `app/api/campaigns/[campaignId]/send-campaign-message/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth';
import { MessageQueueService } from '@/lib/messaging/message-queue-service';
import { resolveTemplateVariables } from '@/lib/messaging/template-resolver';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const auth = await requireAuth(request);
    await requireRole(request, ['admin', 'owner']);
    const campaignId = params.campaignId;
    const body = await request.json();

    const { channel, templateId, recipientFilter } = body;

    // Validate input
    if (!channel || !['email', 'sms', 'whatsapp'].includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel' },
        { status: 400 }
      );
    }

    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId is required' },
        { status: 400 }
      );
    }

    // Get campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { organization: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify authorization
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_orgId: {
          userId: auth.userId,
          orgId: campaign.orgId,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Get template
    const template = await prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || template.orgId !== campaign.orgId) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Build lead filter
    const leadFilter: Record<string, unknown> = {
      orgId: campaign.orgId,
      campaignId,
    };

    if (recipientFilter?.status) {
      leadFilter.status = { in: recipientFilter.status };
    }

    // Get leads matching filter
    const leads = await prisma.lead.findMany({
      where: leadFilter,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
      },
    });

    if (leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads match the filter', sentCount: 0 },
        { status: 400 }
      );
    }

    // Queue message for each lead
    const queueService = new MessageQueueService(prisma);
    const sentMessages = [];

    for (const lead of leads) {
      // Check if lead has required contact info
      if (channel === 'email' && !lead.email) continue;
      if ((channel === 'sms' || channel === 'whatsapp') && !lead.phoneNumber) continue;

      const templateVars = {
        firstName: lead.firstName,
        lastName: lead.lastName,
        fullName: `${lead.firstName} ${lead.lastName}`.trim(),
        campaignName: campaign.name,
        adName: campaign.adName,
        orgName: campaign.orgId,
      };

      const messageBody = resolveTemplateVariables(template.body, templateVars);
      const messageSubject = template.subject
        ? resolveTemplateVariables(template.subject, templateVars)
        : undefined;

      const message = await queueService.enqueue({
        orgId: campaign.orgId,
        leadId: lead.id,
        channel: channel as 'email' | 'sms' | 'whatsapp',
        templateId,
        recipientEmail: channel === 'email' ? lead.email : undefined,
        recipientPhone: channel !== 'email' ? lead.phoneNumber : undefined,
        subject: messageSubject,
        body: messageBody,
        scheduledFor: null,
      });

      sentMessages.push(message.id);
    }

    logger.info('Campaign broadcast queued', {
      campaignId,
      channel,
      sentCount: sentMessages.length,
      orgId: campaign.orgId,
    });

    return NextResponse.json({
      success: true,
      sentCount: sentMessages.length,
      messageIds: sentMessages,
    });
  } catch (error) {
    logger.error('Failed to broadcast campaign message', { error });
    return NextResponse.json(
      { error: 'Failed to broadcast message' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/campaigns/[campaignId]/send-campaign-message/route.ts
git commit -m "feat: add campaign broadcast endpoint for sending messages to filtered leads"
```

---

## Task 11: Create Message History and Queue Status Endpoints

**Files:**
- Create: `app/api/leads/[leadId]/message-history/route.ts`
- Create: `app/api/organizations/[orgId]/messages/queue/route.ts`

- [ ] **Step 1: Create message history endpoint**

Create `app/api/leads/[leadId]/message-history/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const auth = await requireAuth(request);
    const leadId = params.leadId;

    // Get lead and verify access
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_orgId: {
          userId: auth.userId,
          orgId: lead.orgId,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Get message history
    const messages = await prisma.messageQueue.findMany({
      where: { leadId },
      include: {
        template: {
          select: { name: true },
        },
        logs: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const history = messages.map((msg) => ({
      id: msg.id,
      channel: msg.channel,
      status: msg.status,
      deliveryStatus: msg.deliveryStatus,
      sentAt: msg.sentAt,
      subject: msg.subject,
      template: msg.template?.name,
      recipient: msg.recipientEmail || msg.recipientPhone,
      createdAt: msg.createdAt,
    }));

    return NextResponse.json(history);
  } catch (error) {
    logger.error('Failed to get message history', { error });
    return NextResponse.json(
      { error: 'Failed to get message history' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create queue status endpoint**

Create `app/api/organizations/[orgId]/messages/queue/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const auth = await requireAuth(request);
    const orgId = params.orgId;

    // Verify member access
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_orgId: {
          userId: auth.userId,
          orgId,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Get pending messages by channel
    const pending = await prisma.messageQueue.findMany({
      where: {
        orgId,
        status: 'pending',
      },
      include: {
        lead: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { scheduledFor: 'asc' },
    });

    // Get summary stats
    const stats = await prisma.messageQueue.groupBy({
      by: ['channel', 'status'],
      where: { orgId },
      _count: { id: true },
    });

    return NextResponse.json({
      pending: pending.map((msg) => ({
        id: msg.id,
        channel: msg.channel,
        lead: `${msg.lead.firstName} ${msg.lead.lastName}`,
        recipient: msg.recipientEmail || msg.recipientPhone,
        scheduledFor: msg.scheduledFor,
        retryCount: msg.retryCount,
      })),
      summary: stats,
    });
  } catch (error) {
    logger.error('Failed to get message queue', { error });
    return NextResponse.json(
      { error: 'Failed to get message queue' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/leads/[leadId]/message-history/route.ts app/api/organizations/[orgId]/messages/queue/route.ts
git commit -m "feat: add message history and queue status endpoints"
```

---

## Task 12: Create Message Delivery Job Scheduler

**Files:**
- Modify: `lib/jobs/schedule-jobs.ts`

- [ ] **Step 1: Add imports and initialize job in schedule-jobs.ts**

Find the `schedule-jobs.ts` file and add the message delivery job. First, add imports at the top:

```typescript
import { SendGridClient } from '@/lib/messaging/sendgrid-client';
import { TwilioClient } from '@/lib/messaging/twilio-client';
import { MetaWhatsAppClient } from '@/lib/messaging/meta-whatsapp-client';
import { MessageQueueService } from '@/lib/messaging/message-queue-service';
import {
  messagessentTotal,
  messagesFailedTotal,
  messageSendDurationSeconds,
  providerApiErrorsTotal,
} from '@/lib/metrics';
```

- [ ] **Step 2: Initialize messaging clients in initializeJobScheduler function**

Add this code inside the `initializeJobScheduler()` function before the existing job schedules:

```typescript
// Initialize messaging clients
const sendGridClient = new SendGridClient({
  apiKey: process.env.SENDGRID_API_KEY || '',
  fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@company.com',
  fromName: process.env.SENDGRID_FROM_NAME || 'Meta Ads CRM',
});

const twilioClient = new TwilioClient({
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  fromNumber: process.env.TWILIO_PHONE_NUMBER || '',
});

const messageQueueService = new MessageQueueService(prisma);
```

- [ ] **Step 3: Add message delivery job function**

Add this function before `initializeJobScheduler`:

```typescript
async function processMessageQueue(): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info('Starting message delivery job');

    // Get all pending messages (grouped by org for efficiency)
    const batchSize = parseInt(process.env.MESSAGE_SEND_BATCH_SIZE || '100');

    // Get unique orgs with pending messages
    const orgsWithPending = await prisma.messageQueue.findMany({
      where: { status: 'pending', scheduledFor: { lte: new Date() } },
      distinct: ['orgId'],
      select: { orgId: true },
    });

    let totalProcessed = 0;
    let totalSent = 0;
    let totalFailed = 0;

    for (const org of orgsWithPending) {
      const messages = await messageQueueService.getPendingMessages(org.orgId, batchSize);

      for (const message of messages) {
        const sendStartTime = Date.now();
        let success = false;
        let error = '';

        try {
          // Update status to sending
          await prisma.messageQueue.update({
            where: { id: message.id },
            data: { status: 'sending' },
          });

          let result: { success: boolean; externalId?: string; error?: string };

          // Send to appropriate provider
          if (message.channel === 'email') {
            if (!sendGridClient || !process.env.SENDGRID_API_KEY) {
              throw new Error('SendGrid not configured');
            }
            result = await sendGridClient.send({
              to: message.recipientEmail || '',
              subject: message.subject || 'Message',
              body: message.body,
            });
          } else if (message.channel === 'sms') {
            if (!twilioClient || !process.env.TWILIO_ACCOUNT_SID) {
              throw new Error('Twilio not configured');
            }
            result = await twilioClient.send({
              to: message.recipientPhone || '',
              body: message.body,
            });
          } else if (message.channel === 'whatsapp') {
            const metaAccount = await prisma.metaAdAccount.findFirst({
              where: { orgId: message.orgId },
            });

            if (!metaAccount?.metaAccessToken) {
              throw new Error('Meta WhatsApp not configured');
            }

            const waClient = new MetaWhatsAppClient({
              accessToken: metaAccount.metaAccessToken,
              phoneNumberId: metaAccount.metaPhoneNumberId || '',
            });

            result = await waClient.send({
              to: message.recipientPhone || '',
              body: message.body,
            });
          } else {
            throw new Error(`Unknown channel: ${message.channel}`);
          }

          if (result.success) {
            await messageQueueService.updateStatus(
              message.id,
              'sent',
              result.externalId
            );

            messagessentTotal.inc({
              channel: message.channel,
              org_id: message.orgId,
            });

            success = true;
            totalSent++;

            logger.info('Message sent successfully', {
              messageId: message.id,
              channel: message.channel,
              externalId: result.externalId,
            });
          } else {
            error = result.error || 'Unknown error';

            // Check if error is transient
            const isTransient = isTransientError(error);

            if (isTransient && message.retryCount < 3) {
              await messageQueueService.retryMessage(message.id, error);
              logger.info('Message queued for retry', {
                messageId: message.id,
                retryCount: message.retryCount + 1,
                error,
              });
            } else {
              await messageQueueService.markAsFailed(message.id, error);
              messagesFailedTotal.inc({
                channel: message.channel,
                reason: isTransient ? 'max_retries' : 'permanent',
                org_id: message.orgId,
              });

              logger.error('Message failed permanently', {
                messageId: message.id,
                error,
              });
            }

            totalFailed++;
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          logger.error('Error processing message', {
            messageId: message.id,
            error: errorMsg,
          });

          messagesFailedTotal.inc({
            channel: message.channel,
            reason: 'internal_error',
            org_id: message.orgId,
          });

          if (message.retryCount < 3) {
            await messageQueueService.retryMessage(message.id, errorMsg);
          } else {
            await messageQueueService.markAsFailed(message.id, errorMsg);
          }

          totalFailed++;
        } finally {
          // Record send duration
          const duration = (Date.now() - sendStartTime) / 1000;
          messageSendDurationSeconds.observe(
            { channel: message.channel, org_id: message.orgId },
            duration
          );
        }

        totalProcessed++;
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    logger.info('Message delivery job completed', {
      totalProcessed,
      totalSent,
      totalFailed,
      duration,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Message delivery job failed', { error: errorMsg });
  }
}

function isTransientError(error: string): boolean {
  // Check for transient error patterns
  return (
    error.includes('timeout') ||
    error.includes('429') ||
    error.includes('5xx') ||
    error.includes('ECONNREFUSED') ||
    error.includes('ENOTFOUND')
  );
}
```

- [ ] **Step 4: Schedule the job in initializeJobScheduler**

Add after the existing job schedules (inside the function):

```typescript
// Message delivery job every 5 minutes
schedule.scheduleJob('*/5 * * * *', processMessageQueue);
logger.info('Message delivery job scheduled to run every 5 minutes');
```

- [ ] **Step 5: Commit**

```bash
git add lib/jobs/schedule-jobs.ts
git commit -m "feat: add message delivery job scheduler with provider integration and retry logic"
```

---

## Task 13: Create Webhook Handlers for Delivery Status

**Files:**
- Create: `app/api/webhooks/sendgrid/route.ts`
- Create: `app/api/webhooks/twilio/route.ts`
- Create: `app/api/webhooks/meta-whatsapp/route.ts`

- [ ] **Step 1: Create SendGrid webhook handler**

Create `app/api/webhooks/sendgrid/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = process.env.SENDGRID_API_KEY;

    // Validate webhook signature
    const signature = request.headers.get('x-twilio-email-event-webhook-signature');
    if (!signature || !validateSendGridSignature(body, signature, apiKey)) {
      logger.warn('Invalid SendGrid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Process events
    for (const event of Array.isArray(body) ? body : [body]) {
      const { sg_message_id, event: eventType, email } = event;

      if (!sg_message_id) continue;

      // Find message by external ID
      const message = await prisma.messageQueue.findFirst({
        where: { externalId: sg_message_id },
      });

      if (!message) {
        logger.warn('Received webhook for unknown message', { sg_message_id });
        continue;
      }

      // Map SendGrid event types to delivery status
      let deliveryStatus: string | undefined;
      let updateStatus: string | undefined;

      switch (eventType) {
        case 'delivered':
          deliveryStatus = 'delivered';
          updateStatus = 'sent';
          break;
        case 'bounce':
          deliveryStatus = 'bounced';
          updateStatus = 'bounced';
          break;
        case 'complaint':
          deliveryStatus = 'complained';
          break;
        case 'dropped':
          deliveryStatus = 'dropped';
          break;
      }

      // Update message queue
      if (updateStatus) {
        await prisma.messageQueue.update({
          where: { id: message.id },
          data: {
            status: updateStatus as any,
            deliveryStatus,
          },
        });
      } else if (deliveryStatus) {
        await prisma.messageQueue.update({
          where: { id: message.id },
          data: { deliveryStatus },
        });
      }

      // Log delivery event
      await prisma.messageLog.create({
        data: {
          queueId: message.id,
          orgId: message.orgId,
          status: eventType as 'sent' | 'failed' | 'bounced',
          metadata: event,
        },
      });

      logger.info('SendGrid webhook processed', {
        messageId: message.id,
        eventType,
        email,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('SendGrid webhook error', { error });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

function validateSendGridSignature(
  body: unknown,
  signature: string,
  apiKey?: string
): boolean {
  if (!apiKey) return false;

  // SendGrid signature validation (simplified)
  // In production, implement full webhook signature validation
  return signature.length > 0;
}
```

- [ ] **Step 2: Create Twilio webhook handler**

Create `app/api/webhooks/twilio/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;

    if (!messageSid || !messageStatus) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find message by external ID
    const message = await prisma.messageQueue.findFirst({
      where: { externalId: messageSid },
    });

    if (!message) {
      logger.warn('Received Twilio webhook for unknown message', { messageSid });
      return NextResponse.json({ success: true });
    }

    // Map Twilio status to delivery status
    let deliveryStatus: string | undefined;
    let updateStatus: string | undefined;

    switch (messageStatus) {
      case 'sent':
      case 'delivered':
        updateStatus = 'sent';
        deliveryStatus = 'delivered';
        break;
      case 'failed':
      case 'undelivered':
        updateStatus = 'failed';
        deliveryStatus = 'undelivered';
        break;
      case 'queued':
        deliveryStatus = 'queued';
        break;
    }

    // Update message queue
    if (updateStatus) {
      await prisma.messageQueue.update({
        where: { id: message.id },
        data: {
          status: updateStatus as any,
          deliveryStatus,
        },
      });
    } else if (deliveryStatus) {
      await prisma.messageQueue.update({
        where: { id: message.id },
        data: { deliveryStatus },
      });
    }

    // Log delivery event
    await prisma.messageLog.create({
      data: {
        queueId: message.id,
        orgId: message.orgId,
        status: updateStatus === 'failed' ? 'failed' : 'sent',
        metadata: Object.fromEntries(formData),
      },
    });

    logger.info('Twilio webhook processed', {
      messageId: message.id,
      messageStatus,
      messageSid,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Twilio webhook error', { error });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create Meta WhatsApp webhook handler**

Create `app/api/webhooks/meta-whatsapp/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook token
    const token = request.headers.get('x-hub-signature-256');
    const webhookToken = process.env.WHATSAPP_WEBHOOK_TOKEN;

    if (!webhookToken || !token) {
      logger.warn('Missing webhook token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process webhook entry
    const { entry } = body;

    if (!Array.isArray(entry)) {
      return NextResponse.json({ success: true });
    }

    for (const item of entry) {
      const { changes } = item;

      if (!Array.isArray(changes)) continue;

      for (const change of changes) {
        const { value } = change;
        const { statuses } = value;

        if (!Array.isArray(statuses)) continue;

        for (const status of statuses) {
          const { id: messageSid, status: messageStatus } = status;

          if (!messageSid || !messageStatus) continue;

          // Find message by external ID
          const message = await prisma.messageQueue.findFirst({
            where: { externalId: messageSid },
          });

          if (!message) {
            logger.warn('Received Meta webhook for unknown message', { messageSid });
            continue;
          }

          // Map Meta status to delivery status
          let deliveryStatus: string | undefined;
          let updateStatus: string | undefined;

          switch (messageStatus) {
            case 'sent':
              deliveryStatus = 'sent';
              updateStatus = 'sent';
              break;
            case 'delivered':
              deliveryStatus = 'delivered';
              updateStatus = 'sent';
              break;
            case 'read':
              deliveryStatus = 'read';
              updateStatus = 'sent';
              break;
            case 'failed':
              deliveryStatus = 'failed';
              updateStatus = 'failed';
              break;
          }

          // Update message queue
          if (updateStatus) {
            await prisma.messageQueue.update({
              where: { id: message.id },
              data: {
                status: updateStatus as any,
                deliveryStatus,
              },
            });
          } else if (deliveryStatus) {
            await prisma.messageQueue.update({
              where: { id: message.id },
              data: { deliveryStatus },
            });
          }

          // Log delivery event
          await prisma.messageLog.create({
            data: {
              queueId: message.id,
              orgId: message.orgId,
              status: updateStatus === 'failed' ? 'failed' : 'sent',
              metadata: status,
            },
          });

          logger.info('Meta WhatsApp webhook processed', {
            messageId: message.id,
            messageStatus,
            messageSid,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Meta WhatsApp webhook error', { error });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const webhookToken = process.env.WHATSAPP_WEBHOOK_TOKEN;

    if (mode === 'subscribe' && token === webhookToken && challenge) {
      logger.info('Meta webhook verified');
      return new NextResponse(challenge, { status: 200 });
    }

    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 403 }
    );
  } catch (error) {
    logger.error('Meta webhook verification error', { error });
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/
git commit -m "feat: add webhook handlers for SendGrid, Twilio, and Meta WhatsApp delivery status"
```

---

## Task 14: Add Environment Variables Documentation

**Files:**
- Create: `.env.example` (update if exists)

- [ ] **Step 1: Update .env.example with messaging variables**

Add or update `.env.example` to include:

```bash
# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@company.com
SENDGRID_FROM_NAME=Meta Ads CRM

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Meta WhatsApp
WHATSAPP_WEBHOOK_TOKEN=your-webhook-token

# Messaging Configuration
MESSAGE_SEND_BATCH_SIZE=100
MESSAGE_RETRY_MAX_ATTEMPTS=3
MESSAGE_RETRY_BACKOFF_MULTIPLIER=2
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add messaging environment variables documentation"
```

---

## Task 15: Create Integration Tests for Full Message Flow

**Files:**
- Create: `tests/messaging-integration.test.ts`

- [ ] **Step 1: Write comprehensive integration test**

Create `tests/messaging-integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { MessageQueueService } from '@/lib/messaging/message-queue-service';
import { resolveTemplateVariables } from '@/lib/messaging/template-resolver';

describe('Messaging Integration', () => {
  let queueService: MessageQueueService;

  beforeEach(() => {
    queueService = new MessageQueueService(prisma);
  });

  it('should handle complete message flow from creation to delivery', async () => {
    // 1. Create organization and lead
    const org = await prisma.organization.create({
      data: {
        name: 'Test Org',
        slug: 'test-org-' + Date.now(),
      },
    });

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
        providerId: 'google-123',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        orgId: org.id,
        role: 'admin',
      },
    });

    const campaign = await prisma.campaign.create({
      data: {
        orgId: org.id,
        name: 'Test Campaign',
        adName: 'Test Ad',
        metaCampaignId: 'meta-123',
        status: 'active',
      },
    });

    const lead = await prisma.lead.create({
      data: {
        orgId: org.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        campaignId: campaign.id,
        status: 'new',
      },
    });

    // 2. Create message template
    const template = await prisma.messageTemplate.create({
      data: {
        orgId: org.id,
        name: 'Welcome Template',
        channel: 'email',
        subject: 'Welcome {{firstName}}!',
        body: 'Hi {{firstName}}, thanks for your interest in {{campaignName}}',
        createdBy: user.id,
      },
    });

    // 3. Queue message
    const message = await queueService.enqueue({
      orgId: org.id,
      leadId: lead.id,
      channel: 'email',
      templateId: template.id,
      recipientEmail: lead.email,
      subject: 'Welcome John!',
      body: 'Hi John, thanks for your interest in Test Campaign',
      scheduledFor: null,
    });

    expect(message.status).toBe('pending');
    expect(message.retryCount).toBe(0);

    // 4. Simulate message processing
    const updated = await queueService.updateStatus(message.id, 'sent', 'ext-123');
    expect(updated.status).toBe('sent');
    expect(updated.sentAt).toBeTruthy();

    // 5. Log delivery
    const log = await queueService.logDelivery(message.id, 'delivered', {
      timestamp: new Date(),
    });

    expect(log.status).toBe('delivered');

    // Cleanup
    await prisma.messageLog.deleteMany({ where: { queueId: message.id } });
    await prisma.messageQueue.delete({ where: { id: message.id } });
    await prisma.messageTemplate.delete({ where: { id: template.id } });
    await prisma.lead.delete({ where: { id: lead.id } });
    await prisma.campaign.delete({ where: { id: campaign.id } });
    await prisma.organizationMember.delete({
      where: { userId_orgId: { userId: user.id, orgId: org.id } },
    });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.organization.delete({ where: { id: org.id } });
  });

  it('should resolve template variables correctly', () => {
    const template = 'Hi {{firstName}} {{lastName}}, check out {{campaignName}} - {{linkUrl}}';
    const variables = {
      firstName: 'Jane',
      lastName: 'Smith',
      campaignName: 'Summer Sale',
      linkUrl: 'https://example.com',
    };

    const resolved = resolveTemplateVariables(template, variables);
    expect(resolved).toBe(
      'Hi Jane Smith, check out Summer Sale - https://example.com'
    );
  });

  it('should handle retry logic with exponential backoff', async () => {
    const org = await prisma.organization.create({
      data: {
        name: 'Retry Test Org',
        slug: 'retry-org-' + Date.now(),
      },
    });

    const lead = await prisma.lead.create({
      data: {
        orgId: org.id,
        firstName: 'Test',
        lastName: 'Lead',
        email: 'test@example.com',
        status: 'new',
      },
    });

    const message = await queueService.enqueue({
      orgId: org.id,
      leadId: lead.id,
      channel: 'email',
      recipientEmail: lead.email,
      subject: 'Test',
      body: 'Test message',
      scheduledFor: null,
    });

    const now = Date.now();

    // Retry 1: 1 minute backoff
    let retried = await queueService.retryMessage(message.id, 'Timeout');
    expect(retried.retryCount).toBe(1);
    expect(retried.status).toBe('pending');
    const retry1Time = retried.scheduledFor?.getTime() || 0;
    expect(retry1Time - now).toBeGreaterThan(55000); // ~1 minute

    // Retry 2: 5 minute backoff
    retried = await queueService.retryMessage(message.id, 'Timeout');
    expect(retried.retryCount).toBe(2);
    const retry2Time = retried.scheduledFor?.getTime() || 0;
    expect(retry2Time - retry1Time).toBeGreaterThan(290000); // ~5 minutes

    // Cleanup
    await prisma.messageQueue.delete({ where: { id: message.id } });
    await prisma.lead.delete({ where: { id: lead.id } });
    await prisma.organization.delete({ where: { id: org.id } });
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npm test -- tests/messaging-integration.test.ts
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/messaging-integration.test.ts
git commit -m "test: add comprehensive messaging integration tests"
```
