import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

export async function GET() {
  let settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        id: 1,
        waMessageTemplate:
          "Hi {{name}}, thanks for your interest! I'd love to share more details with you.",
      },
    });
  }
  // Mask the token
  const masked = settings.metaAccessToken
    ? settings.metaAccessToken.slice(0, 6) + "••••••••" + settings.metaAccessToken.slice(-4)
    : null;
  return NextResponse.json({ ...settings, metaAccessTokenMasked: masked });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  // Don't overwrite token if it's the masked version
  if (body.metaAccessToken && body.metaAccessToken.includes("••••••")) {
    delete body.metaAccessToken;
  }

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: body,
    create: { id: 1, ...body },
  });
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const { action } = await req.json();
  if (action === "generate_verify_token") {
    const token = randomBytes(20).toString("hex");
    await prisma.settings.upsert({
      where: { id: 1 },
      update: { webhookVerifyToken: token },
      create: { id: 1, webhookVerifyToken: token },
    });
    return NextResponse.json({ token });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
