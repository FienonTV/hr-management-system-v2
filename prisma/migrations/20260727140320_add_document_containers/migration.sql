-- AlterTable
ALTER TABLE "files" ADD COLUMN     "container_id" TEXT;

-- CreateTable
CREATE TABLE "document_containers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "snoozed_until" TIMESTAMP(3),
    "category" "file_category" NOT NULL DEFAULT 'OTHER',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_containers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_containers_tenant_id_idx" ON "document_containers"("tenant_id");

-- CreateIndex
CREATE INDEX "document_containers_tenant_id_employee_id_idx" ON "document_containers"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "document_containers_tenant_id_isDeleted_idx" ON "document_containers"("tenant_id", "isDeleted");

-- CreateIndex
CREATE INDEX "document_containers_tenant_id_category_idx" ON "document_containers"("tenant_id", "category");

-- CreateIndex
CREATE INDEX "files_tenant_id_container_id_idx" ON "files"("tenant_id", "container_id");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "document_containers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_containers" ADD CONSTRAINT "document_containers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_containers" ADD CONSTRAINT "document_containers_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
