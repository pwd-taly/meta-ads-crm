import logger from '@/lib/logger';

interface TwilioConfig {
  apiKey: string;
  apiSid: string;
  fromPhone: string;
}

interface SendMessageOptions {
  to: string;
  body: string;
}

interface SendResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export class TwilioClient {
  private apiKey: string;
  private apiSid: string;
  private fromPhone: string;
  private phoneValidationPattern = /^\+\d{7,15}$/;

  constructor(config: TwilioConfig) {
    this.apiKey = config.apiKey;
    this.apiSid = config.apiSid;
    this.fromPhone = config.fromPhone;
  }

  async send(options: SendMessageOptions): Promise<SendResult> {
    // Validate phone number
    if (!this.isValidPhoneNumber(options.to)) {
      return { success: false, error: 'Invalid phone number (E.164 format required)' };
    }

    try {
      const response = await this.callTwilioApi({
        To: options.to,
        From: this.fromPhone,
        Body: options.body,
      });

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

  private async callTwilioApi(payload: Record<string, string>): Promise<{ sid: string }> {
    const auth = Buffer.from(`${this.apiSid}:${this.apiKey}`).toString('base64');

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.apiSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(payload).toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Twilio API error: ${response.status} ${text}`);
    }

    const data = await response.json() as { sid?: string };
    if (!data.sid) {
      throw new Error('Twilio API error: No SID in response');
    }

    return { sid: data.sid };
  }

  private isValidPhoneNumber(phone: string): boolean {
    return this.phoneValidationPattern.test(phone);
  }
}
