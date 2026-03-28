import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encodeJWT, verifyPassword } from "@/lib/db/auth";

export async function POST(request: NextRequest) {
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const { email, password } = payload;

  try {

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash);

    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Get all orgs user is member of
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: { org: true },
    });

    if (memberships.length === 0) {
      return NextResponse.json(
        { error: "User has no organization" },
        { status: 401 }
      );
    }

    // Select primary org (first one, or user can specify in future)
    const primary = memberships[0];

    // Create JWT for primary org
    const token = await encodeJWT({
      userId: user.id,
      orgId: primary.orgId,
      email: user.email,
      role: primary.role,
    });

    // Set cookie
    const response = NextResponse.json(
      {
        user: { id: user.id, email: user.email },
        orgs: memberships.map((m) => ({
          orgId: m.orgId,
          orgName: m.org.name,
          role: m.role,
        })),
        message: memberships.length > 1
          ? "You belong to multiple organizations. Use POST /api/organizations/switch-account to change."
          : "Login successful",
      },
      { status: 200 }
    );

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
