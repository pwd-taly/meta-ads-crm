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
