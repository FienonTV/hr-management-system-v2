
CREATE TYPE "vehicle_status" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_ORDER');

CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "license_plate" TEXT,
    "status" "vehicle_status" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vehicles_tenant_id_idx" ON "vehicles"("tenant_id");
CREATE INDEX "vehicles_tenant_id_status_idx" ON "vehicles"("tenant_id", "status");
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_vehicles" ON "vehicles" USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);
CREATE POLICY "tenant_isolation_vehicles_insert" ON "vehicles" FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant')::TEXT);

CREATE TYPE "daily_plan_status" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "daily_plans" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "daily_plan_status" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "daily_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "daily_plans_tenant_id_date_key" ON "daily_plans"("tenant_id", "date");
CREATE INDEX "daily_plans_tenant_id_date_idx" ON "daily_plans"("tenant_id", "date");
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "daily_plans" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_daily_plans" ON "daily_plans" USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);
CREATE POLICY "tenant_isolation_daily_plans_insert" ON "daily_plans" FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant')::TEXT);

CREATE TABLE "daily_plan_sites" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    CONSTRAINT "daily_plan_sites_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "daily_plan_sites_tenant_id_plan_id_idx" ON "daily_plan_sites"("tenant_id", "plan_id");
CREATE INDEX "daily_plan_sites_tenant_id_project_id_idx" ON "daily_plan_sites"("tenant_id", "project_id");
ALTER TABLE "daily_plan_sites" ADD CONSTRAINT "daily_plan_sites_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "daily_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_plan_sites" ADD CONSTRAINT "daily_plan_sites_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_plan_sites" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_daily_plan_sites" ON "daily_plan_sites" USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);
CREATE POLICY "tenant_isolation_daily_plan_sites_insert" ON "daily_plan_sites" FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant')::TEXT);

CREATE TABLE "daily_plan_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "vehicle_id" TEXT,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "notes" TEXT,
    CONSTRAINT "daily_plan_assignments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "daily_plan_assignments_tenant_id_site_id_idx" ON "daily_plan_assignments"("tenant_id", "site_id");
CREATE INDEX "daily_plan_assignments_tenant_id_employee_id_idx" ON "daily_plan_assignments"("tenant_id", "employee_id");
CREATE INDEX "daily_plan_assignments_tenant_id_vehicle_id_idx" ON "daily_plan_assignments"("tenant_id", "vehicle_id");
ALTER TABLE "daily_plan_assignments" ADD CONSTRAINT "daily_plan_assignments_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "daily_plan_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_plan_assignments" ADD CONSTRAINT "daily_plan_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_plan_assignments" ADD CONSTRAINT "daily_plan_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_plan_assignments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_daily_plan_assignments" ON "daily_plan_assignments" USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);
CREATE POLICY "tenant_isolation_daily_plan_assignments_insert" ON "daily_plan_assignments" FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant')::TEXT);
