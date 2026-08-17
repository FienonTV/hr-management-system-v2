-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "project_milestone_status" AS ENUM ('OPEN', 'DONE');

-- CreateEnum
CREATE TYPE "project_material_status" AS ENUM ('ORDERED', 'DELIVERED', 'USED');

-- CreateEnum
CREATE TYPE "time_entry_type" AS ENUM ('REGULAR', 'OVERTIME', 'TRAVEL', 'BREAK');

-- CreateEnum
CREATE TYPE "time_entry_status" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "project_status" NOT NULL DEFAULT 'PLANNED',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "customer_name" TEXT,
    "customer_email" TEXT,
    "address" TEXT,
    "budget" DECIMAL(12,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_employees" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Mitarbeiter',
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_milestones" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "planned_date" TIMESTAMP(3),
    "actual_date" TIMESTAMP(3),
    "status" "project_milestone_status" NOT NULL DEFAULT 'OPEN',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_materials" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "woocommerce_order_id" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(10,3),
    "unit" TEXT,
    "status" "project_material_status" NOT NULL DEFAULT 'ORDERED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "project_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "description" TEXT,
    "type" "time_entry_type" NOT NULL DEFAULT 'REGULAR',
    "status" "time_entry_status" NOT NULL DEFAULT 'DRAFT',
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_exports" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "file_id" TEXT,
    "generated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "woocommerce_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "store_url" TEXT NOT NULL,
    "consumer_key" TEXT NOT NULL,
    "consumer_secret" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "woocommerce_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "woocommerce_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "external_order_id" TEXT NOT NULL,
    "order_number" TEXT,
    "status" TEXT NOT NULL,
    "total" DECIMAL(12,2),
    "currency" TEXT,
    "customer_name" TEXT,
    "customer_email" TEXT,
    "date_created" TIMESTAMP(3),
    "raw_data" JSONB,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "woocommerce_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "smtp_host" TEXT,
    "smtp_port" INTEGER,
    "smtp_user" TEXT,
    "smtp_password" TEXT,
    "imap_host" TEXT,
    "imap_port" INTEGER,
    "imap_user" TEXT,
    "imap_password" TEXT,
    "from_address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_tenant_id_name_key" ON "projects"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "projects_tenant_id_idx" ON "projects"("tenant_id");
CREATE INDEX "projects_tenant_id_status_idx" ON "projects"("tenant_id", "status");
CREATE INDEX "projects_tenant_id_start_date_idx" ON "projects"("tenant_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "project_employees_tenant_id_project_id_employee_id_key" ON "project_employees"("tenant_id", "project_id", "employee_id");
CREATE INDEX "project_employees_tenant_id_project_id_idx" ON "project_employees"("tenant_id", "project_id");
CREATE INDEX "project_employees_tenant_id_employee_id_idx" ON "project_employees"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "project_milestones_tenant_id_project_id_idx" ON "project_milestones"("tenant_id", "project_id");
CREATE INDEX "project_milestones_tenant_id_project_id_status_idx" ON "project_milestones"("tenant_id", "project_id", "status");

-- CreateIndex
CREATE INDEX "project_materials_tenant_id_project_id_idx" ON "project_materials"("tenant_id", "project_id");
CREATE INDEX "project_materials_tenant_id_woocommerce_order_id_idx" ON "project_materials"("tenant_id", "woocommerce_order_id");

-- CreateIndex
CREATE INDEX "time_entries_tenant_id_idx" ON "time_entries"("tenant_id");
CREATE INDEX "time_entries_tenant_id_employee_id_idx" ON "time_entries"("tenant_id", "employee_id");
CREATE INDEX "time_entries_tenant_id_project_id_idx" ON "time_entries"("tenant_id", "project_id");
CREATE INDEX "time_entries_tenant_id_date_idx" ON "time_entries"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "payroll_exports_tenant_id_year_month_idx" ON "payroll_exports"("tenant_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "woocommerce_settings_tenant_id_key" ON "woocommerce_settings"("tenant_id");
CREATE INDEX "woocommerce_settings_tenant_id_is_active_idx" ON "woocommerce_settings"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "woocommerce_orders_tenant_id_external_order_id_key" ON "woocommerce_orders"("tenant_id", "external_order_id");
CREATE INDEX "woocommerce_orders_tenant_id_status_idx" ON "woocommerce_orders"("tenant_id", "status");
CREATE INDEX "woocommerce_orders_tenant_id_date_created_idx" ON "woocommerce_orders"("tenant_id", "date_created");

-- CreateIndex
CREATE UNIQUE INDEX "email_settings_tenant_id_key" ON "email_settings"("tenant_id");
CREATE INDEX "email_settings_tenant_id_is_active_idx" ON "email_settings"("tenant_id", "is_active");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_employees" ADD CONSTRAINT "project_employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_employees" ADD CONSTRAINT "project_employees_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_employees" ADD CONSTRAINT "project_employees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_materials" ADD CONSTRAINT "project_materials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_materials" ADD CONSTRAINT "project_materials_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_exports" ADD CONSTRAINT "payroll_exports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "woocommerce_settings" ADD CONSTRAINT "woocommerce_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "woocommerce_orders" ADD CONSTRAINT "woocommerce_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "woocommerce_orders" ADD CONSTRAINT "woocommerce_orders_setting_fkey" FOREIGN KEY ("tenant_id") REFERENCES "woocommerce_settings"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_settings" ADD CONSTRAINT "email_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "files" ADD COLUMN "project_id" TEXT;
CREATE INDEX "files_tenant_id_project_id_idx" ON "files"("tenant_id", "project_id");
ALTER TABLE "files" ADD CONSTRAINT "files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: projects
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_projects" ON "projects" USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);
CREATE POLICY "tenant_isolation_projects_insert" ON "projects" FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant')::TEXT);

-- RLS: project_employees
ALTER TABLE "project_employees" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_project_employees" ON "project_employees" USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);
CREATE POLICY "tenant_isolation_project_employees_insert" ON "project_employees" FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant')::TEXT);

-- RLS: project_milestones
ALTER TABLE "project_milestones" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_project_milestones" ON "project_milestones" USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);
CREATE POLICY "tenant_isolation_project_milestones_insert" ON "project_milestones" FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant')::TEXT);

-- RLS: project_materials
ALTER TABLE "project_materials" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_project_materials" ON "project_materials" USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);
CREATE POLICY "tenant_isolation_project_materials_insert" ON "project_materials" FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant')::TEXT);

-- RLS: time_entries
ALTER TABLE "time_entries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_time_entries" ON "time_entries" USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);
CREATE POLICY "tenant_isolation_time_entries_insert" ON "time_entries" FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant')::TEXT);

-- RLS: payroll_exports
ALTER TABLE "payroll_exports" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_payroll_exports" ON "payroll_exports" USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);
CREATE POLICY "tenant_isolation_payroll_exports_insert" ON "payroll_exports" FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant')::TEXT);

-- RLS: woocommerce_settings
ALTER TABLE "woocommerce_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_woocommerce_settings" ON "woocommerce_settings" USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);
CREATE POLICY "tenant_isolation_woocommerce_settings_insert" ON "woocommerce_settings" FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant')::TEXT);

-- RLS: woocommerce_orders
ALTER TABLE "woocommerce_orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_woocommerce_orders" ON "woocommerce_orders" USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);
CREATE POLICY "tenant_isolation_woocommerce_orders_insert" ON "woocommerce_orders" FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant')::TEXT);

-- RLS: email_settings
ALTER TABLE "email_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_email_settings" ON "email_settings" USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);
CREATE POLICY "tenant_isolation_email_settings_insert" ON "email_settings" FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant')::TEXT);

-- RLS: files project_id update
DROP POLICY IF EXISTS "tenant_isolation_files" ON "files";
DROP POLICY IF EXISTS "tenant_isolation_files_insert" ON "files";
CREATE POLICY "tenant_isolation_files" ON "files" USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);
CREATE POLICY "tenant_isolation_files_insert" ON "files" FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant')::TEXT);
