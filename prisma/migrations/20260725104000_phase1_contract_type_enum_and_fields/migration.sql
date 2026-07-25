-- Migration: phase1_contract_type_enum_and_fields
-- Created at: 20260725104000

-- Create contract_type enum
CREATE TYPE "contract_type" AS ENUM ('PERMANENT', 'FIXED_TERM', 'MINIJOB', 'WORKER');

-- Add new columns to employment_contracts
ALTER TABLE "employment_contracts" ADD COLUMN "title" TEXT;
ALTER TABLE "employment_contracts" ADD COLUMN "salary_json" TEXT;
ALTER TABLE "employment_contracts" ADD COLUMN "contract_type_new" "contract_type";

-- Drop old job_description and salary columns
ALTER TABLE "employment_contracts" DROP COLUMN IF EXISTS "job_description";
ALTER TABLE "employment_contracts" DROP COLUMN IF EXISTS "salary";

-- Migrate existing contract_type text values to enum
UPDATE "employment_contracts"
SET "contract_type_new" = CASE "contract_type"
  WHEN 'unlimited' THEN 'PERMANENT'::"contract_type"
  WHEN 'fixed' THEN 'FIXED_TERM'::"contract_type"
  WHEN 'mini_job' THEN 'MINIJOB'::"contract_type"
  WHEN 'contractor' THEN 'WORKER'::"contract_type"
  WHEN 'intern' THEN 'WORKER'::"contract_type"
  ELSE 'PERMANENT'::"contract_type"
END;

-- Set title defaults for existing rows based on the new contract type
UPDATE "employment_contracts"
SET "title" = CASE "contract_type_new"
  WHEN 'PERMANENT'::"contract_type" THEN 'Unbefristeter Arbeitsvertrag'
  WHEN 'FIXED_TERM'::"contract_type" THEN 'Befristeter Arbeitsvertrag'
  WHEN 'MINIJOB'::"contract_type" THEN 'Minijob-Vertrag'
  WHEN 'WORKER'::"contract_type" THEN 'Werkvertrag'
  ELSE 'Arbeitsvertrag'
END
WHERE "title" IS NULL;

-- Make title not null
ALTER TABLE "employment_contracts" ALTER COLUMN "title" SET NOT NULL;

-- Drop old contract_type column and rename new one
ALTER TABLE "employment_contracts" DROP COLUMN "contract_type";
ALTER TABLE "employment_contracts" RENAME COLUMN "contract_type_new" TO "contract_type";

-- Make contract_type not null
ALTER TABLE "employment_contracts" ALTER COLUMN "contract_type" SET NOT NULL;

-- Add RLS policies
ALTER TABLE "employment_contracts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employment_contracts_tenant_isolation" ON "employment_contracts"
  USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);

CREATE POLICY "employment_contracts_select" ON "employment_contracts"
  FOR SELECT USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);

CREATE POLICY "employment_contracts_insert" ON "employment_contracts"
  FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant')::TEXT);

CREATE POLICY "employment_contracts_update" ON "employment_contracts"
  FOR UPDATE USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);

CREATE POLICY "employment_contracts_delete" ON "employment_contracts"
  FOR DELETE USING ("tenant_id" = current_setting('app.current_tenant')::TEXT);
