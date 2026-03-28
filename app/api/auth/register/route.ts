import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encodeJWT, hashPassword } from "@/lib/db/auth";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    let payload;
    try {
      payload = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { email, password, orgName } = payload;

    // Validate input
    if (!email || !password || !orgName) {
      return NextResponse.json(
        { error: "Missing email, password, or orgName" },
        { status: 400 }
      );
    }

    // Email format validation
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Password strength validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user, org, and membership in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
        },
      });

      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug: orgName.toLowerCase().replace(/\s+/g, "-"),
        },
      });

      const member = await tx.organizationMember.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: "admin",
        },
      });

      return { user, org, member };
    });

    // Create JWT
    const token = await encodeJWT({
      userId: result.user.id,
      orgId: result.org.id,
      email: result.user.email,
      role: result.member.role,
    });

    // Set cookie and return
    const response = NextResponse.json(
      { user: result.user, org: result.org },
      { status: 201 }
    );
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);

    // Handle Prisma unique constraint errors
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint violation
        const field = (error.meta?.target as string[])?.join(", ") || "field";
        return NextResponse.json(
          { error: `A user with this ${field} already exists` },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
