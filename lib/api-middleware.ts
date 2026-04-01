// lib/api-middleware.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Context object passed to authenticated API handlers.
 * Contains user and organization information extracted from request headers.
 */
export interface ApiContext {
  userId: string;
  orgId: string;
  role: string;
}

/**
 * Type signature for API handlers that require authentication.
 * Handlers receive the request, auth context, and the route context (e.g. dynamic params).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiHandler<TRouteContext = any> = (
  request: NextRequest,
  context: ApiContext,
  routeContext: TRouteContext
) => Promise<NextResponse>;

/**
 * Wraps an API handler to require authentication.
 * Extracts userId, orgId, and role from request headers (set by middleware).
 * Returns 401 Unauthorized if any required header is missing.
 *
 * @param handler The API handler function to wrap
 * @returns An async function that validates auth headers and calls the handler
 *
 * @example
 * export const GET = requireAuth(async (request, context) => {
 *   // context.userId, context.orgId, context.role are guaranteed to be set
 *   return NextResponse.json({ orgId: context.orgId });
 * });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function requireAuth<TRouteContext = any>(handler: ApiHandler<TRouteContext>) {
  return async (request: NextRequest, routeContext: TRouteContext) => {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");
    const role = request.headers.get("x-user-role");

    if (!userId || !orgId || !role) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return handler(request, { userId, orgId, role }, routeContext);
  };
}

/**
 * Wraps an API handler to require both authentication and a minimum role level.
 * Validates that the user's role has sufficient permissions for the operation.
 * Role hierarchy: admin (3) > manager (2) > viewer (1)
 * Returns 403 Forbidden if user lacks required permissions.
 *
 * @param requiredRole The minimum role required (admin, manager, or viewer)
 * @param handler The API handler function to wrap
 * @returns An async function that validates auth and role, then calls the handler
 *
 * @example
 * export const DELETE = requireRole("admin", async (request, context) => {
 *   // Only admin users can reach this code
 *   return NextResponse.json({ success: true });
 * });
 */
export function requireRole<TRouteContext = any>(requiredRole: string, handler: ApiHandler<TRouteContext>) {
  return requireAuth<TRouteContext>(async (request: NextRequest, context: ApiContext, routeContext: TRouteContext) => {
    const roleHierarchy = { admin: 3, manager: 2, viewer: 1 };
    const userLevel = roleHierarchy[context.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    if (userLevel < requiredLevel) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return handler(request, context, routeContext);
  });
}
