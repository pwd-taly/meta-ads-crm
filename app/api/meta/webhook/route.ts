import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHmac } from "crypto";

async function verifyMetaSignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return true; // skip if not configured
  const signature = req.headers.get("x-hub-signature-256");
  if (!signature) return false;
  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
  // Timing-safe comparison
  try {
    const { timingSafeEqual } = await import("crypto");
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return signature === expected;
  }
}

// GET: Meta verification handshake
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const verifyToken = settings?.webhookVerifyToken || process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST: Receive new lead from Meta
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const valid = await verifyMetaSignature(req, rawBody);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const body = JSON.parse(rawBody);

  try {
    const entries = body?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        if (change.field !== "leadgen") continue;

        const value = change.value;
        const leadId = value?.leadgen_id?.toString();
        const formId = value?.form_id?.toString();
        const campaignId = value?.campaign_id?.toString();
        const campaignName = value?.campaign_name;
        const adsetName = value?.adset_name;
        const adName = value?.ad_name;
        const metaAdAccountId = value?.ad_account_id?.toString();

        // Fetch full lead data from Meta if we have access token
        const settings = await prisma.settings.findUnique({ where: { id: 1 } });
        let name = "Unknown";
        let email: string | undefined;
        let phone: string | undefined;
        let formName: string | undefined;

        if (settings?.metaAccessToken && leadId) {
          try {
            const url = `https://graph.facebook.com/v20.0/${leadId}?access_token=${settings.metaAccessToken}`;
            const resp = await fetch(url);
            if (resp.ok) {
              const data = await resp.json();
              formName = data.form_id;
              const fieldData: Array<{ name: string; values: string[] }> = data.field_data || [];
              for (const field of fieldData) {
                const n = field.name.toLowerCase();
                const v = field.values?.[0] || "";
                if (n.includes("full_name") || n.includes("name")) name = v;
                else if (n.includes("email")) email = v;
                else if (n.includes("phone")) phone = v;
              }
            }
          } catch {
            // fallback to partial data
          }
        }

        // Lookup MetaAdAccount to find orgId
        if (!metaAdAccountId) {
          console.warn("No ad_account_id in webhook payload, skipping lead");
          continue;
        }

        const metaAccount = await prisma.metaAdAccount.findUnique({
          where: { metaAdAccountId },
        });

        if (!metaAccount) {
          console.warn(
            `MetaAdAccount not found for metaAdAccountId: ${metaAdAccountId}, skipping lead`
          );
          continue;
        }

        console.info(
          `Creating lead for orgId: ${metaAccount.orgId}, metaAdAccountId: ${metaAdAccountId}`
        );

        await prisma.lead.upsert({
          where: { metaLeadId: leadId || `manual_${Date.now()}` },
          update: {},
          create: {
            metaLeadId: leadId,
            name,
            email,
            phone,
            campaignId,
            campaignName,
            adsetName,
            adName,
            formName: formName || formId,
            status: "new",
            source: "webhook",
            orgId: metaAccount.orgId,
            metaAdAccountId: metaAccount.id,
          },
        });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
