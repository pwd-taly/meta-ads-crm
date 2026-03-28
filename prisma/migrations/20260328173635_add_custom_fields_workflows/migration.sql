-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "customValues" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "customValues" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "trigger" JSONB NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "conditionLogic" TEXT NOT NULL DEFAULT 'AND',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowExecution" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "conditionsMet" BOOLEAN,
    "actionResults" JSONB NOT NULL DEFAULT '[]',
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_orgId_entityType_name_key" ON "CustomField"("orgId", "entityType", "name");

-- CreateIndex
CREATE INDEX "CustomField_orgId_entityType_idx" ON "CustomField"("orgId", "entityType");

-- CreateIndex
CREATE INDEX "CustomField_orgId_createdAt_idx" ON "CustomField"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Workflow_orgId_isActive_idx" ON "Workflow"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "Workflow_orgId_entityType_idx" ON "Workflow"("orgId", "entityType");

-- CreateIndex
CREATE INDEX "WorkflowExecution_workflowId_triggeredAt_idx" ON "WorkflowExecution"("workflowId", "triggeredAt");

-- CreateIndex
CREATE INDEX "WorkflowExecution_orgId_completedAt_idx" ON "WorkflowExecution"("orgId", "completedAt");

-- CreateIndex
CREATE INDEX "WorkflowExecution_entityId_entityType_idx" ON "WorkflowExecution"("entityId", "entityType");

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
