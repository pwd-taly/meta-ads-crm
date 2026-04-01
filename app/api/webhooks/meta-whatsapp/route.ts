import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';
import * as metrics from '@/lib/metrics';
import { MessageQueueService } from '@/lib/messaging/message-queue-service';

interface MetaWebhookMessage {
  id: string;
  status?: string;
  timestamp?: string;
  type?: string;
  errors?: Array<{ code: number; title: string; message: string }>;
}

interface MetaWebhookChange {
  value: {
    messaging_product?: string;
    metadata?: {
      display_phone_number?: string;
      phone_number_id?: string;
    };
    messages?: MetaWebhookMessage[];
    statuses?: Array<{
      id: string;
      status: string;
      timestamp: string;
      recipient_id?: string;
    }>;
  };
  field?: string;
}

interface MetaWebhookEntry {
  id: string;
  changes: MetaWebhookChange[];
}

interface MetaWebhook {
  object?: string;
  entry?: MetaWebhookEntry[];
}

const messageQueueService = new MessageQueueService();

/**
 * Map Meta WhatsApp status to our statuses
 */
function mapMetaStatusToOurStatus(metaStatus: string): string {
  const statusMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'sent',
    'read': 'sent',
    'failed': 'failed',
  };

  return statusMap[metaStatus] || 'pending';
}

/**
 * Validate Meta webhook signature using HMAC-SHA256
 * https://developers.facebook.com/docs/messenger-platform/webhooks#validate-payloads
 */
async function validateMetaSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return false;

  const signature = request.headers.get('x-hub-signature-256');
  if (!signature || !signature.startsWith('sha256=')) return false;

  const expected = signature.slice('sha256='.length);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const computed = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison to prevent timing attacks
  if (computed.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Find message by Meta message ID
 */
async function findMessageByExternalId(externalId: string) {
  return prisma.messageQueue.findFirst({
    where: { externalId },
    select: {
      id: true,
      orgId: true,
      channel: true,
    },
  });
}

/**
 * Handle GET request for webhook verification
 */
export async function GET(request: NextRequest) {
  try {
    const challenge = request.nextUrl.searchParams.get('hub.challenge');
    const mode = request.nextUrl.searchParams.get('hub.mode');
    const token = request.nextUrl.searchParams.get('hub.verify_token');

    logger.info('Meta WhatsApp webhook verification request', {
      context: 'meta-whatsapp-webhook',
      mode,
      token: token ? 'provided' : 'missing',
    });

    if (mode !== 'subscribe') {
      return NextResponse.json(
        { error: 'Invalid mode' },
        { status: 403 }
      );
    }

    const expectedToken = process.env.WHATSAPP_WEBHOOK_TOKEN;
    if (!expectedToken || token !== expectedToken) {
      logger.warn('Meta WhatsApp webhook verification failed', {
        context: 'meta-whatsapp-webhook',
        reason: 'Invalid token',
      });
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 403 }
      );
    }

    if (!challenge) {
      return NextResponse.json(
        { error: 'Missing challenge' },
        { status: 400 }
      );
    }

    logger.info('Meta WhatsApp webhook verified', {
      context: 'meta-whatsapp-webhook',
    });

    return new NextResponse(challenge);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Meta WhatsApp webhook GET handler failed', {
      context: 'meta-whatsapp-webhook',
      error: errorMsg,
    });

    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle POST request for webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const data: MetaWebhook = JSON.parse(body);

    logger.info('Received Meta WhatsApp webhook', {
      context: 'meta-whatsapp-webhook',
      object: data.object,
      entryCount: data.entry?.length || 0,
    });

    // Validate HMAC-SHA256 signature
    if (!await validateMetaSignature(request, body)) {
      logger.warn('Meta WhatsApp webhook signature validation failed', {
        context: 'meta-whatsapp-webhook',
      });
      // Still return 200 to prevent Meta retries on validation failures
      return NextResponse.json({ success: true });
    }

    if (!data.entry || data.entry.length === 0) {
      return NextResponse.json({ success: true });
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const entry of data.entry) {
      try {
        for (const change of entry.changes) {
          const changeData = change.value;

          // Handle message status updates
          if (changeData.statuses && changeData.statuses.length > 0) {
            for (const statusUpdate of changeData.statuses) {
              try {
                const messageId = statusUpdate.id;
                const metaStatus = statusUpdate.status;

                // Find our message
                const message = await findMessageByExternalId(messageId);

                if (!message) {
                  logger.debug(
                    'Message not found for Meta status update',
                    {
                      context: 'meta-whatsapp-webhook',
                      externalId: messageId,
                      status: metaStatus,
                    }
                  );
                  continue;
                }

                // Map status
                const ourStatus = mapMetaStatusToOurStatus(metaStatus);

                // Update message status
                await messageQueueService.updateStatus(
                  message.id,
                  ourStatus,
                  {
                    externalId: messageId,
                    deliveryStatus: metaStatus,
                  }
                );

                // Log delivery
                await messageQueueService.logDelivery(
                  message.id,
                  message.orgId,
                  ourStatus,
                  {
                    metaStatus,
                    metaMessageId: messageId,
                    timestamp: statusUpdate.timestamp,
                    recipientId: statusUpdate.recipient_id,
                  }
                );

                // Record metrics
                if (ourStatus === 'sent') {
                  metrics.messagesSentTotal
                    .labels('whatsapp', message.orgId)
                    .inc();
                } else if (ourStatus === 'failed') {
                  metrics.messagesFailedTotal
                    .labels('whatsapp', 'api_error', message.orgId)
                    .inc();
                }

                logger.info('Meta WhatsApp status update processed', {
                  context: 'meta-whatsapp-webhook',
                  messageId: message.id,
                  status: metaStatus,
                  ourStatus,
                });

                processedCount++;
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                logger.error('Failed to process Meta status update', {
                  context: 'meta-whatsapp-webhook',
                  error: errorMsg,
                });
                errorCount++;
              }
            }
          }

          // Handle incoming messages (optional - for future two-way messaging)
          if (changeData.messages && changeData.messages.length > 0) {
            logger.debug('Received incoming Meta WhatsApp message', {
              context: 'meta-whatsapp-webhook',
              messageCount: changeData.messages.length,
            });
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Failed to process Meta webhook entry', {
          context: 'meta-whatsapp-webhook',
          entryId: entry.id,
          error: errorMsg,
        });
        errorCount++;
      }
    }

    logger.info('Meta WhatsApp webhook processing completed', {
      context: 'meta-whatsapp-webhook',
      processedCount,
      errorCount,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Meta WhatsApp webhook POST handler failed', {
      context: 'meta-whatsapp-webhook',
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return 200 to prevent Meta from retrying invalid payloads
    return NextResponse.json({ success: true });
  }
}
