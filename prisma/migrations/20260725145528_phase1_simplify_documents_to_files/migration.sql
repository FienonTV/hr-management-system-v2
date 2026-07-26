/*
  Warnings:

  - You are about to drop the column `document_container_id` on the `files` table. All the data in the column will be lost.
  - You are about to drop the `document_containers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `file_document_categories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "document_containers" DROP CONSTRAINT "document_containers_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "document_containers" DROP CONSTRAINT "document_containers_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "document_containers" DROP CONSTRAINT "document_containers_uploaded_by_id_fkey";

-- DropForeignKey
ALTER TABLE "file_document_categories" DROP CONSTRAINT "file_document_categories_category_id_fkey";

-- DropForeignKey
ALTER TABLE "file_document_categories" DROP CONSTRAINT "file_document_categories_file_id_fkey";

-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_document_container_id_fkey";

-- DropIndex
DROP INDEX "files_tenant_id_document_container_id_idx";

-- AlterTable
ALTER TABLE "files" DROP COLUMN "document_container_id",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "snoozed_until" TIMESTAMP(3),
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '';

-- DropTable
DROP TABLE "document_containers";

-- DropTable
DROP TABLE "file_document_categories";
