// prisma/migrate-existing-data.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting data migration for multi-tenancy...");

  // Check if migration already ran
  const existingOrg = await prisma.organization.findUnique({
    where: { slug: "default-org" },
  });
  if (existingOrg) {
    console.log("Migration already completed. Exiting.");
    return;
  }

  // Create default organization
  const org = await prisma.organization.create({
    data: {
      name: "Default Organization",
      slug: "default-org",
    },
  });

  console.log(`Created organization: ${org.id}`);

  // Check if there are any leads at all
  const totalLeads = await prisma.lead.count();

  if (totalLeads > 0) {
    // Get all leads that may have been migrated or assigned to default org
    const leadsToMigrate = await prisma.lead.findMany({
      where: { orgId: { not: org.id } },
      take: 10,
    });

    if (leadsToMigrate.length > 0) {
      // Update all leads that are not yet assigned to this org
      const result = await prisma.lead.updateMany({
        where: { orgId: { not: org.id } },
        data: { orgId: org.id },
      });

      console.log(`Migrated ${result.count} leads to default org`);
    } else {
      console.log(`${totalLeads} leads already assigned to organization`);
    }
  } else {
    console.log("No leads to migrate");
  }

  // Create a default user (optional — replace with actual user email)
  const user = await prisma.user.findUnique({
    where: { email: "admin@example.com" },
  });

  if (!user) {
    console.log("No default user found. Create one manually via /api/auth/register");
  } else {
    // Create membership for existing user
    const existing = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId: user.id, orgId: org.id } },
    });

    if (!existing) {
      await prisma.organizationMember.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: "admin",
        },
      });

      console.log("Created org membership for existing user");
    }
  }

  console.log("Data migration completed.");
}

main()
  .then(() => {
    console.log("Migration successful");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
