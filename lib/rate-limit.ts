// Simple in-memory rate limiter
// Max 5 failed attempts per IP per 15 minutes

interface Attempt {
  count: number;
  firstAt: number;
  blockedUntil?: number;
}

const store = new Map<string, Attempt>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 30 * 60 * 1000; // 30 min block after exceeding

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = store.get(ip);

  // Clean up old entries every so often
  if (store.size > 500) {
    for (const [key, val] of store.entries()) {
      if (now - val.firstAt > WINDOW_MS * 2) store.delete(key);
    }
  }

  if (!entry) {
    return { allowed: true };
  }

  // Still blocked?
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  // Window expired — reset
  if (now - entry.firstAt > WINDOW_MS) {
    store.delete(ip);
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(BLOCK_MS / 1000),
    };
  }

  return { allowed: true };
}

export function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry) {
    store.set(ip, { count: 1, firstAt: now });
  } else {
    entry.count++;
  }
}

export function resetAttempts(ip: string) {
  store.delete(ip);
}
