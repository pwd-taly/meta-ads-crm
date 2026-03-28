import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Seed settings
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      waMessageTemplate:
        "Hi {{name}}, thanks for your interest! I'd love to share more details with you.",
    },
  });

  // Get or create default org
  let org = await prisma.organization.findUnique({
    where: { slug: "default-org" },
  });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Default Organization",
        slug: "default-org",
      },
    });
  }

  // Seed sample leads
  const leads: Array<{
    metaLeadId: string;
    name: string;
    email: string;
    phone: string;
    campaignName: string;
    adsetName: string;
    adName: string;
    formName: string;
    status: "new" | "contacted" | "booked" | "closed" | "lost";
    bookingDate?: Date;
    saleAmount?: number;
    notes?: string;
    source: string;
  }> = [
    {
      metaLeadId: "meta_lead_001",
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      phone: "15551234567",
      campaignName: "Spring Sale 2026",
      adsetName: "Women 25-40 Istanbul",
      adName: "Before After Video",
      formName: "Consultation Request",
      status: "booked",
      bookingDate: new Date("2026-03-20"),
      notes: "Interested in rhinoplasty. Very motivated.",
      source: "webhook",
    },
    {
      metaLeadId: "meta_lead_002",
      name: "Ahmed Al-Rashid",
      email: "ahmed.rashid@gmail.com",
      phone: "971501234567",
      campaignName: "Spring Sale 2026",
      adsetName: "Men 30-50 UAE",
      adName: "Clinic Tour Ad",
      formName: "Free Consultation",
      status: "closed",
      bookingDate: new Date("2026-03-15"),
      saleAmount: 4500,
      notes: "Booked rhinoplasty procedure.",
      source: "webhook",
    },
    {
      metaLeadId: "meta_lead_003",
      name: "Maria González",
      email: "maria.g@hotmail.com",
      phone: "34612345678",
      campaignName: "European Outreach",
      adsetName: "Spain Women 20-35",
      adName: "Results Carousel",
      formName: "Consultation Request",
      status: "contacted",
      notes: "Asked about pricing. Needs follow-up.",
      source: "csv",
    },
    {
      metaLeadId: "meta_lead_004",
      name: "Lena Müller",
      email: "lena.muller@web.de",
      phone: "4915212345678",
      campaignName: "European Outreach",
      adsetName: "Germany Women 25-45",
      adName: "Doctor Interview",
      formName: "Free Consultation",
      status: "new",
      source: "webhook",
    },
    {
      metaLeadId: "meta_lead_005",
      name: "Fatima Al-Zahra",
      email: "fatima.alzahra@outlook.com",
      phone: "966501234567",
      campaignName: "Gulf Campaign",
      adsetName: "KSA Women 25-40",
      adName: "Testimonial Video",
      formName: "Consultation Request",
      status: "new",
      source: "webhook",
    },
    {
      metaLeadId: "meta_lead_006",
      name: "James Wilson",
      email: "jwilson@gmail.com",
      phone: "447912345678",
      campaignName: "UK Campaign",
      adsetName: "UK Mixed 28-45",
      adName: "Celebrity Feature",
      formName: "Free Consultation",
      status: "lost",
      notes: "Not responding to messages.",
      source: "csv",
    },
  ];

  for (const lead of leads) {
    await prisma.lead.upsert({
      where: { metaLeadId: lead.metaLeadId },
      update: {},
      create: { ...lead, orgId: org.id },
    });
  }

  console.log("✅ Database seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
