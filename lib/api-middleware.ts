// lib/api-middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function requireAuth(handler: Function) {
  return async (request: NextRequest) => {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");
    const role = request.headers.get("x-user-role");

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return handler(request, { userId, orgId, role });
  };
}

export function requireRole(requiredRole: string, handler: Function) {
  return requireAuth(async (request: NextRequest, context: any) => {
    const roleHierarchy = { admin: 3, manager: 2, viewer: 1 };
    const userLevel = roleHierarchy[context.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    if (userLevel < requiredLevel) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return handler(request, context);
  });
}
