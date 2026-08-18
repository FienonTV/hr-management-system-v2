ALTER TABLE daily_plan_sites ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE daily_plan_sites ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE daily_plan_sites ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE daily_plan_sites ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE daily_plan_sites ADD COLUMN IF NOT EXISTS vehicle_plates TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE daily_plan_sites ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE daily_plan_assignments DROP COLUMN IF EXISTS vehicle_id;
DROP INDEX IF EXISTS daily_plan_assignments_tenant_id_vehicle_id_idx;
