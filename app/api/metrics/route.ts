import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/metrics';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const metrics = await register.metrics();
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': register.contentType,
      },
    });
  } catch (error) {
    logger.error('Failed to generate metrics', {
      context: 'metrics-endpoint',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
