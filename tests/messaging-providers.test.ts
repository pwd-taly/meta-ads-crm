import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SendGridClient } from '@/lib/messaging/sendgrid-client';
import { TwilioClient } from '@/lib/messaging/twilio-client';
import { MetaWhatsAppClient } from '@/lib/messaging/meta-whatsapp-client';

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

  it('should prefer html content when provided', async () => {
    const sendSpy = vi.spyOn(client as any, 'callSendGridApi');
    sendSpy.mockResolvedValueOnce({ id: 'sg-real-123' });

    await client.send({
      to: 'user@example.com',
      subject: 'Test',
      body: 'Plain text',
      html: '<p>HTML content</p>',
    });

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        content: [{ type: 'text/html', value: '<p>HTML content</p>' }],
      })
    );
  });

  it('should reject invalid email addresses', async () => {
    const invalidEmails = ['@domain.com', 'user@', 'user@domain', 'user @domain.com'];

    for (const email of invalidEmails) {
      const result = await client.send({
        to: email,
        subject: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email');
    }
  });
});

describe('TwilioClient', () => {
  let client: TwilioClient;

  beforeEach(() => {
    client = new TwilioClient({
      apiKey: 'test-key',
      apiSid: 'test-sid',
      fromPhone: '+1234567890',
    });
  });

  it('should validate phone number in E.164 format before sending', async () => {
    const result = await client.send({
      to: 'invalid-phone',
      body: 'Test message',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid phone');
  });

  it('should accept valid E.164 phone numbers', async () => {
    const sendSpy = vi.spyOn(client as any, 'callTwilioApi');
    sendSpy.mockResolvedValueOnce({ sid: 'SM-123' });

    const result = await client.send({
      to: '+14155552671',
      body: 'Test message',
    });

    expect(result.success).toBe(true);
    expect(result.externalId).toBe('SM-123');
  });

  it('should reject invalid E.164 phone numbers', async () => {
    const invalidPhones = ['1234567890', '+1', '+123456789012345678', '123', ''];

    for (const phone of invalidPhones) {
      const result = await client.send({
        to: phone,
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone');
    }
  });

  it('should format message correctly for Twilio API', async () => {
    const sendSpy = vi.spyOn(client as any, 'callTwilioApi');
    sendSpy.mockResolvedValueOnce({ sid: 'SM-456' });

    await client.send({
      to: '+14155552671',
      body: 'Test body',
    });

    expect(sendSpy).toHaveBeenCalledWith({
      To: '+14155552671',
      From: '+1234567890',
      Body: 'Test body',
    });
  });

  it('should return external message ID on success', async () => {
    vi.spyOn(client as any, 'callTwilioApi').mockResolvedValueOnce({ sid: 'SM-789' });

    const result = await client.send({
      to: '+14155552671',
      body: 'Test',
    });

    expect(result.success).toBe(true);
    expect(result.externalId).toBe('SM-789');
  });

  it('should handle API errors gracefully', async () => {
    vi.spyOn(client as any, 'callTwilioApi').mockRejectedValueOnce(
      new Error('API Error: 401 Unauthorized')
    );

    const result = await client.send({
      to: '+14155552671',
      body: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('API Error');
  });
});

describe('MetaWhatsAppClient', () => {
  let client: MetaWhatsAppClient;

  beforeEach(() => {
    client = new MetaWhatsAppClient({
      apiKey: 'test-key',
      businessAccountId: 'test-biz-id',
      phoneNumberId: 'test-phone-id',
    });
  });

  it('should validate phone number in E.164 format before sending', async () => {
    const result = await client.send({
      to: 'invalid-phone',
      body: 'Test message',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid phone');
  });

  it('should accept valid E.164 phone numbers', async () => {
    const sendSpy = vi.spyOn(client as any, 'callMetaApi');
    sendSpy.mockResolvedValueOnce({ messages: [{ id: 'wamid-123' }] });

    const result = await client.send({
      to: '+14155552671',
      body: 'Test message',
    });

    expect(result.success).toBe(true);
    expect(result.externalId).toBe('wamid-123');
  });

  it('should reject invalid E.164 phone numbers', async () => {
    const invalidPhones = ['1234567890', '+1', '+123456789012345678', '123', ''];

    for (const phone of invalidPhones) {
      const result = await client.send({
        to: phone,
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone');
    }
  });

  it('should format message correctly for Meta API', async () => {
    const sendSpy = vi.spyOn(client as any, 'callMetaApi');
    sendSpy.mockResolvedValueOnce({ messages: [{ id: 'wamid-456' }] });

    await client.send({
      to: '+14155552671',
      body: 'Test body',
    });

    expect(sendSpy).toHaveBeenCalledWith({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '14155552671',
      type: 'text',
      text: { body: 'Test body' },
    });
  });

  it('should return external message ID on success', async () => {
    vi.spyOn(client as any, 'callMetaApi').mockResolvedValueOnce({ messages: [{ id: 'wamid-789' }] });

    const result = await client.send({
      to: '+14155552671',
      body: 'Test',
    });

    expect(result.success).toBe(true);
    expect(result.externalId).toBe('wamid-789');
  });

  it('should handle API errors gracefully', async () => {
    vi.spyOn(client as any, 'callMetaApi').mockRejectedValueOnce(
      new Error('API Error: 401 Unauthorized')
    );

    const result = await client.send({
      to: '+14155552671',
      body: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('API Error');
  });
});
