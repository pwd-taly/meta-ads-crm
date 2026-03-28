// lib/db/auth.ts
import { SignJWT, jwtVerify } from "jose";
import bcryptjs from "bcryptjs";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

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
  // Use bcryptjs for secure password hashing
  // bcryptjs handles salt generation internally
  const saltRounds = 10;
  const hash = await bcryptjs.hash(password, saltRounds);
  return hash;
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcryptjs.compare(password, hash);
}
