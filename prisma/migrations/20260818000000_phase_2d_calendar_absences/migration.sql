-- CreateEnum
CREATE TYPE "calendar_event_type" AS ENUM ('WORK', 'ABSENCE', 'MEETING', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "absence_type" AS ENUM ('VACATION', 'SICK', 'PARENTAL', 'UNPAID', 'OTHER');

-- CreateEnum
CREATE TYPE "absence_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "type" "calendar_event_type" NOT NULL DEFAULT 'WORK',
    "employee_id" TEXT,
    "absence_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absence_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "type" "absence_type" NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" "absence_status" NOT NULL DEFAULT 'PENDING',
    "requested_by_id" TEXT,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absence_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_absence_id_fkey" FOREIGN KEY ("absence_id") REFERENCES "absence_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "calendar_events_tenant_id_idx" ON "calendar_events"("tenant_id");

-- CreateIndex
CREATE INDEX "calendar_events_tenant_id_start_at_end_at_idx" ON "calendar_events"("tenant_id", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "calendar_events_tenant_id_employee_id_idx" ON "calendar_events"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "calendar_events_tenant_id_type_idx" ON "calendar_events"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "absence_requests_tenant_id_idx" ON "absence_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "absence_requests_tenant_id_employee_id_idx" ON "absence_requests"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "absence_requests_tenant_id_start_at_end_at_idx" ON "absence_requests"("tenant_id", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "absence_requests_tenant_id_status_idx" ON "absence_requests"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "absence_requests_tenant_id_type_idx" ON "absence_requests"("tenant_id", "type");

-- Enable RLS
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "absence_requests" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_events
CREATE POLICY tenant_isolation_calendar_events ON "calendar_events" AS PERMISSIVE FOR ALL
  TO public
  USING ("tenant_id" = current_setting('app.current_tenant_id')::TEXT)
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant_id')::TEXT);

-- RLS Policies for absence_requests
CREATE POLICY tenant_isolation_absence_requests ON "absence_requests" AS PERMISSIVE FOR ALL
  TO public
  USING ("tenant_id" = current_setting('app.current_tenant_id')::TEXT)
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant_id')::TEXT);
