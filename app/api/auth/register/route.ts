import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encodeJWT, hashPassword } from "@/lib/db/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password, orgName } = await request.json();

    // Validate input
    if (!email || !password || !orgName) {
      return NextResponse.json(
        { error: "Missing email, password, or orgName" },
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
