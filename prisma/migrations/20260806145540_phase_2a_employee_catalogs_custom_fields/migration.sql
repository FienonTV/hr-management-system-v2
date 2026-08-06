/*
  Warnings:

  - You are about to drop the column `department` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `employees` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "custom_field_type" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT');

-- DropIndex
DROP INDEX "employees_tenant_id_department_idx";

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "department",
DROP COLUMN "position",
ADD COLUMN     "chip_number" TEXT,
ADD COLUMN     "custom_fields" JSONB,
ADD COLUMN     "department_id" TEXT,
ADD COLUMN     "driver_license_classes" TEXT,
ADD COLUMN     "fixed_term_end_date" TIMESTAMP(3),
ADD COLUMN     "forklift_license" BOOLEAN,
ADD COLUMN     "hourly_wage" DECIMAL(10,2),
ADD COLUMN     "key_number" TEXT,
ADD COLUMN     "pay_grade_id" TEXT,
ADD COLUMN     "position_id" TEXT,
ADD COLUMN     "probation_end_date" TIMESTAMP(3),
ADD COLUMN     "vacation_days" INTEGER;

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "manager_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_grades" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "tariff_group" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pay_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "applies_to" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "field_type" "custom_field_type" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "departments_tenant_id_is_active_idx" ON "departments"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenant_id_name_key" ON "departments"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "positions_tenant_id_is_active_idx" ON "positions"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "positions_tenant_id_name_key" ON "positions"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "pay_grades_tenant_id_is_active_idx" ON "pay_grades"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "pay_grades_tenant_id_name_key" ON "pay_grades"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "custom_field_definitions_tenant_id_applies_to_is_active_idx" ON "custom_field_definitions"("tenant_id", "applies_to", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_definitions_tenant_id_applies_to_key_key" ON "custom_field_definitions"("tenant_id", "applies_to", "key");

-- CreateIndex
CREATE INDEX "employees_tenant_id_department_id_idx" ON "employees"("tenant_id", "department_id");

-- CreateIndex
CREATE INDEX "employees_tenant_id_position_id_idx" ON "employees"("tenant_id", "position_id");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_pay_grade_id_fkey" FOREIGN KEY ("pay_grade_id") REFERENCES "pay_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS Policies for Phase 2a tables
ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments" FORCE ROW LEVEL SECURITY;
CREATE POLICY departments_all ON "departments"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', true));

ALTER TABLE "positions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "positions" FORCE ROW LEVEL SECURITY;
CREATE POLICY positions_all ON "positions"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', true));

ALTER TABLE "pay_grades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pay_grades" FORCE ROW LEVEL SECURITY;
CREATE POLICY pay_grades_all ON "pay_grades"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', true));

ALTER TABLE "custom_field_definitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_field_definitions" FORCE ROW LEVEL SECURITY;
CREATE POLICY custom_field_definitions_all ON "custom_field_definitions"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', true));

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_grades" ADD CONSTRAINT "pay_grades_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
