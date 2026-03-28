// lib/db/context.ts
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

export interface AuthContext {
  userId: string;
  orgId: string;
  email: string;
  role: string;
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, secret);
    const payload = verified.payload as any;
    return {
      userId: payload.userId,
      orgId: payload.orgId,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
