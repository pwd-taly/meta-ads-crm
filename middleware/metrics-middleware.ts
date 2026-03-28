import { NextRequest, NextResponse } from 'next/server';
import * as metrics from '@/lib/metrics';
import logger from '@/lib/logger';

export function metricsMiddleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname, searchParams } = request.nextUrl;
  const method = request.method;

  // Skip metrics endpoint itself
  if (pathname === '/api/metrics') {
    return undefined;
  }

  return async (response: NextResponse) => {
    const duration = (Date.now() - startTime) / 1000;
    const status = response.status;

    // Record request metrics
    metrics.httpRequestsTotal.inc({
      method,
      endpoint: pathname,
      status: String(status),
    });

    metrics.httpRequestDurationSeconds.observe(
      { method, endpoint: pathname },
      duration
    );

    // Record error metrics
    if (status >= 400) {
      metrics.httpRequestsErrorsTotal.inc({
        status: String(status),
        endpoint: pathname,
      });

      if (status >= 500) {
        metrics.apiErrors5xxTotal.inc();
      } else if (status >= 400) {
        metrics.apiErrors4xxTotal.inc();
      }
    }

    // Log request
    logger.info('HTTP request completed', {
      context: method + ' ' + pathname,
      method,
      endpoint: pathname,
      status,
      duration_ms: Math.round(duration * 1000),
      status_text: status >= 400 ? 'error' : 'success',
    });

    return response;
  };
}
