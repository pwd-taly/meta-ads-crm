export const dynamic = "force-dynamic";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { prisma } from "@/lib/db";

export default async function SettingsPage() {
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

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your Meta API credentials and preferences
        </p>
      </div>
      <SettingsClient
        initialSettings={{
          metaAdAccountId: settings.metaAdAccountId || "",
          metaPageId: settings.metaPageId || "",
          webhookVerifyToken: settings.webhookVerifyToken || "",
          waMessageTemplate: settings.waMessageTemplate || "",
          waMessageTemplateEs: settings.waMessageTemplateEs || "Hola {{name}}, ¡gracias por tu interés! Me encantaría compartir más detalles contigo.",
          hasToken: !!settings.metaAccessToken,
        }}
      />
    </div>
  );
}
