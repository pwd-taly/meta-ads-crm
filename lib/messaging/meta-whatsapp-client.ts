import logger from '@/lib/logger';

interface MetaWhatsAppConfig {
  apiKey: string;
  businessAccountId: string;
  phoneNumberId: string;
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

export class MetaWhatsAppClient {
  private apiKey: string;
  private businessAccountId: string;
  private phoneNumberId: string;
  private phoneValidationPattern = /^\+\d{7,15}$/;

  constructor(config: MetaWhatsAppConfig) {
    this.apiKey = config.apiKey;
    this.businessAccountId = config.businessAccountId;
    this.phoneNumberId = config.phoneNumberId;
  }

  async send(options: SendMessageOptions): Promise<SendResult> {
    // Validate phone number
    if (!this.isValidPhoneNumber(options.to)) {
      return { success: false, error: 'Invalid phone number (E.164 format required)' };
    }

    try {
      // Remove '+' from phone for Meta API
      const phoneWithoutPlus = options.to.substring(1);

      const response = await this.callMetaApi({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneWithoutPlus,
        type: 'text',
        text: { body: options.body },
      });

      const messageId = response.messages?.[0]?.id;
      if (!messageId) {
        throw new Error('Meta API error: No message ID in response');
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

  private async callMetaApi(payload: Record<string, unknown>): Promise<{ messages?: Array<{ id: string }> }> {
    const response = await fetch(
      `https://graph.instagram.com/v18.0/${this.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Meta API error: ${response.status} ${text}`);
    }

    const data = await response.json() as { messages?: Array<{ id: string }> };
    return data;
  }

  private isValidPhoneNumber(phone: string): boolean {
    return this.phoneValidationPattern.test(phone);
  }
}
