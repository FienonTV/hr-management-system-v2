-- RLS Policies for Phase 2a tables
ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS departments_all ON "departments";
CREATE POLICY departments_all ON "departments"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', true));

ALTER TABLE "positions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "positions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS positions_all ON "positions";
CREATE POLICY positions_all ON "positions"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', true));

ALTER TABLE "pay_grades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pay_grades" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pay_grades_all ON "pay_grades";
CREATE POLICY pay_grades_all ON "pay_grades"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', true));

ALTER TABLE "custom_field_definitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_field_definitions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS custom_field_definitions_all ON "custom_field_definitions";
CREATE POLICY custom_field_definitions_all ON "custom_field_definitions"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', true));
