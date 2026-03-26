-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "metaLeadId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "campaignId" TEXT,
    "campaignName" TEXT,
    "adsetName" TEXT,
    "adName" TEXT,
    "formName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "bookingDate" TIMESTAMP(3),
    "saleAmount" DOUBLE PRECISION,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'webhook',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL,
    "metaAccessToken" TEXT,
    "metaAdAccountId" TEXT,
    "metaPageId" TEXT,
    "webhookVerifyToken" TEXT,
    "waMessageTemplate" TEXT DEFAULT 'Hi {{name}}, thanks for your interest! I''d love to share more details with you.',
    "waMessageTemplateEs" TEXT DEFAULT 'Hola {{name}}, ¡gracias por tu interés! Me encantaría compartir más detalles contigo.',

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_metaLeadId_key" ON "Lead"("metaLeadId");
