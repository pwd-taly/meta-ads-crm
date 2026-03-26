import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { LeadDetailClient } from "@/components/leads/LeadDetailClient";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lead, settings] = await Promise.all([
    prisma.lead.findUnique({ where: { id } }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  if (!lead) notFound();

  const waTemplate =
    settings?.waMessageTemplate ||
    "Hi {{name}}, thanks for your interest! I'd love to share more details with you.";
  const waTemplateEs =
    settings?.waMessageTemplateEs ||
    "Hola {{name}}, ¡gracias por tu interés! Me encantaría compartir más detalles contigo.";

  return <LeadDetailClient lead={lead} waTemplate={waTemplate} waTemplateEs={waTemplateEs} />;
}
