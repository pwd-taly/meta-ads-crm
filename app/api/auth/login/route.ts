import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { timingSafeEqual } from "crypto";
import { checkRateLimit, recordFailedAttempt, resetAttempts } from "@/lib/rate-limit";

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Still do comparison to avoid timing leak on length
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // Get real IP (Railway passes it via x-forwarded-for)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // Rate limit check
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil((limit.retryAfterSeconds || 1800) / 60)} minutes.` },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds || 1800) },
      }
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { password } = body;

  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Timing-safe comparison — prevents timing attacks
  const valid = safeCompare(password, adminPassword);

  if (!valid) {
    recordFailedAttempt(ip);
    // Generic message — don't reveal whether password exists
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Success — clear failed attempts
  resetAttempts(ip);

  const token = await signToken({ role: "admin" });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth_token", token, {
    httpOnly: true,
    sameSite: "strict",          // strict: never sent cross-site
    maxAge: 60 * 60 * 24,        // 24 hours (not 7 days)
    path: "/",
    secure: true,                // always secure in production
  });

  return res;
}
