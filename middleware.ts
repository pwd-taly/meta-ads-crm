import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { metricsMiddleware } from '@/middleware/metrics-middleware';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/meta/webhook"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const verified = await jwtVerify(token, secret);
    const payload = verified.payload as any;

    // Extract auth context from JWT
    const userId = payload.userId;
    const orgId = payload.orgId;
    const email = payload.email;
    const role = payload.role;

    // Validate required claims
    if (!userId || !orgId || !email || !role) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Create response and inject auth context as headers
    const response = NextResponse.next();
    response.headers.set("x-user-id", userId);
    response.headers.set("x-org-id", orgId);
    response.headers.set("x-email", email);
    response.headers.set("x-user-role", role);

    // Apply metrics to all requests except /api/metrics
    if (!request.nextUrl.pathname.includes('/api/metrics')) {
      const applyMetrics = metricsMiddleware(request);
      if (applyMetrics) {
        await applyMetrics(response);
      }
    }

    return response;
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
