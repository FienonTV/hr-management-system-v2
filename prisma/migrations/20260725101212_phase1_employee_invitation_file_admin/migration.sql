
-- CreateEnum
CREATE TYPE "file_category" AS ENUM ('AVATAR', 'CONTRACT', 'PAYSLIP', 'DOCUMENT', 'CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "employment_status" AS ENUM ('ACTIVE', 'INACTIVE', 'ONBOARDING', 'TERMINATED');

-- CreateEnum
CREATE TYPE "employment_type" AS ENUM ('FULL_TIME', 'PART_TIME', 'FREELANCE', 'INTERN', 'APPRENTICE');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('MALE', 'FEMALE', 'DIVERSE', 'NOT_SPECIFIED');

-- CreateEnum
CREATE TYPE "invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "address" JSONB,
ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "employee_number" TEXT,
ADD COLUMN     "employment_type" "employment_type",
ADD COLUMN     "exit_date" TIMESTAMP(3),
ADD COLUMN     "gender" "gender" NOT NULL DEFAULT 'NOT_SPECIFIED',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "sensitive_data" JSONB,
ADD COLUMN     "status" "employment_status" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "category" "file_category" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "employee_id" TEXT,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_latest_version" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parent_id" TEXT,
ADD COLUMN     "parent_type" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "version_of_id" TEXT;

-- AlterTable
ALTER TABLE "tenant_settings" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_by_id" TEXT;

-- CreateTable
CREATE TABLE "employment_contracts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "contract_type" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "weekly_hours" DOUBLE PRECISION,
    "job_description" TEXT,
    "salary" JSONB,
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_tokens" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role_ids" TEXT[],
    "invited_by_id" TEXT,
    "employee_id" TEXT,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "invitation_status" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employment_contracts_tenant_id_idx" ON "employment_contracts"("tenant_id");

-- CreateIndex
CREATE INDEX "employment_contracts_tenant_id_employee_id_idx" ON "employment_contracts"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "employee_documents_tenant_id_employee_id_idx" ON "employee_documents"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "employee_documents_tenant_id_document_type_idx" ON "employee_documents"("tenant_id", "document_type");

-- CreateIndex
CREATE UNIQUE INDEX "employee_documents_tenant_id_employee_id_file_id_key" ON "employee_documents"("tenant_id", "employee_id", "file_id");

-- CreateIndex
CREATE INDEX "invitation_tokens_tenant_id_email_status_idx" ON "invitation_tokens"("tenant_id", "email", "status");

-- CreateIndex
CREATE INDEX "invitation_tokens_tenant_id_status_idx" ON "invitation_tokens"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_tokens_tenant_id_token_hash_key" ON "invitation_tokens"("tenant_id", "token_hash");

-- CreateIndex
CREATE INDEX "employees_tenant_id_status_idx" ON "employees"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "employees_tenant_id_department_idx" ON "employees"("tenant_id", "department");

-- CreateIndex
CREATE INDEX "employees_tenant_id_last_name_idx" ON "employees"("tenant_id", "last_name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenant_id_employee_number_key" ON "employees"("tenant_id", "employee_number");

-- CreateIndex
CREATE INDEX "files_tenant_id_employee_id_idx" ON "files"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "files_tenant_id_parent_type_parent_id_idx" ON "files"("tenant_id", "parent_type", "parent_id");

-- CreateIndex
CREATE INDEX "files_tenant_id_category_idx" ON "files"("tenant_id", "category");

-- CreateIndex
CREATE INDEX "files_version_of_id_idx" ON "files"("version_of_id");

-- CreateIndex
CREATE INDEX "files_tenant_id_isDeleted_idx" ON "files"("tenant_id", "isDeleted");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_version_of_id_fkey" FOREIGN KEY ("version_of_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_contracts" ADD CONSTRAINT "employment_contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_contracts" ADD CONSTRAINT "employment_contracts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_tokens" ADD CONSTRAINT "invitation_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: enable row level security
ALTER TABLE "employment_contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employee_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitation_tokens" ENABLE ROW LEVEL SECURITY;

-- RLS policies: tenant isolation based on current_setting('app.current_tenant_id')
CREATE POLICY tenant_employment_contracts_isolation ON "employment_contracts"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_employee_documents_isolation ON "employee_documents"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_invitation_tokens_isolation ON "invitation_tokens"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::text);
