import logger from '@/lib/logger';

interface SendGridConfig {
  apiKey: string;
  fromEmail?: string;
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
  private fromEmail?: string;
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

    // Extract real message ID from SendGrid response header
    const externalId = response.headers.get('X-Message-ID');
    if (!externalId) {
      throw new Error('SendGrid API error: No X-Message-ID in response headers');
    }

    return { id: externalId };
  }

  private isValidEmail(email: string): boolean {
    // More robust email pattern that requires:
    // - At least one char before @
    // - At least one char for domain
    // - At least one char for TLD (minimum 2 chars)
    const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
}
