// lib/db/auth.ts
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

export async function encodeJWT({
  userId,
  orgId,
  email,
  role,
}: {
  userId: string;
  orgId: string;
  email: string;
  role: string;
}): Promise<string> {
  const token = await new SignJWT({
    userId,
    orgId,
    email,
    role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return token;
}

export async function decodeJWT(token: string) {
  const verified = await jwtVerify(token, secret);
  return verified.payload;
}

export async function hashPassword(password: string): Promise<string> {
  // For MVP, use a simple hash. In production, use bcrypt
  // This is a placeholder — in real code, import bcryptjs
  const encoder = new TextEncoder();
  const data = encoder.encode(password + process.env.PASSWORD_SALT || "salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const hashOfPassword = await hashPassword(password);
  return hashOfPassword === hash;
}
