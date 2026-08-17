-- CreateTable
CREATE TABLE "qualifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "description" TEXT,
    "validity_in_months" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_qualifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "qualification_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "certificate_file_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "qualifications_tenant_id_is_active_idx" ON "qualifications"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "qualifications_tenant_id_name_key" ON "qualifications"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "employee_qualifications_tenant_id_employee_id_idx" ON "employee_qualifications"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "employee_qualifications_tenant_id_qualification_id_idx" ON "employee_qualifications"("tenant_id", "qualification_id");

-- CreateIndex
CREATE INDEX "employee_qualifications_tenant_id_expires_at_idx" ON "employee_qualifications"("tenant_id", "expires_at");

-- AddForeignKey
ALTER TABLE "qualifications" ADD CONSTRAINT "qualifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_qualifications" ADD CONSTRAINT "employee_qualifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_qualifications" ADD CONSTRAINT "employee_qualifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_qualifications" ADD CONSTRAINT "employee_qualifications_qualification_id_fkey" FOREIGN KEY ("qualification_id") REFERENCES "qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_qualifications" ADD CONSTRAINT "employee_qualifications_certificate_file_id_fkey" FOREIGN KEY ("certificate_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS Policies for Phase 2c tables
ALTER TABLE "qualifications" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qualifications_all ON "qualifications";
CREATE POLICY qualifications_all ON "qualifications"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', true));

ALTER TABLE "employee_qualifications" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employee_qualifications_all ON "employee_qualifications";
CREATE POLICY employee_qualifications_all ON "employee_qualifications"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', true));
