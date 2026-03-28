/*
  Warnings:

  - The `status` column on the `Lead` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Settings` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `orgId` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('admin', 'manager', 'viewer');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('meta', 'slack', 'hubspot');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "metaAdAccountId" TEXT,
ADD COLUMN     "orgId" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "LeadStatus" NOT NULL DEFAULT 'new';

-- DropTable
DROP TABLE "Settings";

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'admin',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAdAccount" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "metaAccessToken" TEXT NOT NULL,
    "metaAdAccountId" TEXT NOT NULL,
    "metaPageId" TEXT,
    "webhookVerifyToken" TEXT,
    "waMessageTemplate" TEXT DEFAULT 'Hi {{name}}, thanks for your interest! I''d love to share more details with you.',
    "waMessageTemplateEs" TEXT DEFAULT 'Hola {{name}}, ¡gracias por tu interés! Me encantaría compartir más detalles contigo.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAdAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "metaAdAccountId" TEXT NOT NULL,
    "metaCampaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'active',
    "budget" DOUBLE PRECISION,
    "spend" DOUBLE PRECISION,
    "impressions" INTEGER,
    "clicks" INTEGER,
    "conversions" INTEGER,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "APIIntegration" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "APIIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMember_orgId_idx" ON "OrganizationMember"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_userId_orgId_key" ON "OrganizationMember"("userId", "orgId");

-- CreateIndex
CREATE INDEX "MetaAdAccount_orgId_idx" ON "MetaAdAccount"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_metaCampaignId_key" ON "Campaign"("metaCampaignId");

-- CreateIndex
CREATE INDEX "Campaign_orgId_idx" ON "Campaign"("orgId");

-- CreateIndex
CREATE INDEX "Campaign_metaAdAccountId_idx" ON "Campaign"("metaAdAccountId");

-- CreateIndex
CREATE INDEX "Campaign_orgId_status_idx" ON "Campaign"("orgId", "status");

-- CreateIndex
CREATE INDEX "APIIntegration_orgId_idx" ON "APIIntegration"("orgId");

-- CreateIndex
CREATE INDEX "Lead_orgId_idx" ON "Lead"("orgId");

-- CreateIndex
CREATE INDEX "Lead_metaAdAccountId_idx" ON "Lead"("metaAdAccountId");

-- CreateIndex
CREATE INDEX "Lead_campaignId_idx" ON "Lead"("campaignId");

-- CreateIndex
CREATE INDEX "Lead_orgId_status_idx" ON "Lead"("orgId", "status");

-- CreateIndex
CREATE INDEX "Lead_orgId_createdAt_idx" ON "Lead"("orgId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdAccount" ADD CONSTRAINT "MetaAdAccount_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_metaAdAccountId_fkey" FOREIGN KEY ("metaAdAccountId") REFERENCES "MetaAdAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APIIntegration" ADD CONSTRAINT "APIIntegration_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_metaAdAccountId_fkey" FOREIGN KEY ("metaAdAccountId") REFERENCES "MetaAdAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
