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

  // Get all leads without orgId
  const leadsToMigrate = await prisma.lead.findMany({
    where: { orgId: null },
  });

  if (leadsToMigrate.length > 0) {
    // Update all leads to assign to default org
    await prisma.lead.updateMany({
      where: { orgId: null },
      data: { orgId: org.id },
    });

    console.log(`Migrated ${leadsToMigrate.length} leads to default org`);
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
