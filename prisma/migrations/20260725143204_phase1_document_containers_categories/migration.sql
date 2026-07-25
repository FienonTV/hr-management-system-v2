/*
  Warnings:

  - You are about to drop the `employee_documents` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "employee_documents" DROP CONSTRAINT "employee_documents_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_documents" DROP CONSTRAINT "employee_documents_file_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_documents" DROP CONSTRAINT "employee_documents_tenant_id_fkey";

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "document_container_id" TEXT,
ADD COLUMN     "text_content" TEXT;

-- DropTable
DROP TABLE "employee_documents";

-- CreateTable
CREATE TABLE "document_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_document_categories" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "file_document_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_containers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "valid_from" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "notes" TEXT,
    "snoozed_until" TIMESTAMP(3),
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_containers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_categories_tenant_id_is_active_idx" ON "document_categories"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "document_categories_tenant_id_name_key" ON "document_categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "file_document_categories_category_id_idx" ON "file_document_categories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "file_document_categories_file_id_category_id_key" ON "file_document_categories"("file_id", "category_id");

-- CreateIndex
CREATE INDEX "document_containers_tenant_id_idx" ON "document_containers"("tenant_id");

-- CreateIndex
CREATE INDEX "document_containers_tenant_id_employee_id_idx" ON "document_containers"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "document_containers_tenant_id_expires_at_idx" ON "document_containers"("tenant_id", "expires_at");

-- CreateIndex
CREATE INDEX "files_tenant_id_document_container_id_idx" ON "files"("tenant_id", "document_container_id");

-- AddForeignKey
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_document_categories" ADD CONSTRAINT "file_document_categories_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_document_categories" ADD CONSTRAINT "file_document_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "document_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_containers" ADD CONSTRAINT "document_containers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_containers" ADD CONSTRAINT "document_containers_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_containers" ADD CONSTRAINT "document_containers_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_document_container_id_fkey" FOREIGN KEY ("document_container_id") REFERENCES "document_containers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
