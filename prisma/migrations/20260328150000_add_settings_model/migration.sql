-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "webhookVerifyToken" TEXT,
    "metaAccessToken" TEXT,
    "metaAdAccountId" TEXT,
    "waMessageTemplate" TEXT DEFAULT 'Hi {{name}}, thanks for your interest! I''d love to share more details with you.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
