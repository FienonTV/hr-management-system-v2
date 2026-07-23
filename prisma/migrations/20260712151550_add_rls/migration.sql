-- 1. Enable RLS on all tenant-scoped tables
-- Note: tenants table remains without RLS to allow setup and uniqueness checks
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 2. Force RLS
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE user_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE files FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules FORCE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;

-- 3. Define Isolation Policies
-- For all tenant-scoped tables:
CREATE POLICY tenant_isolation_policy ON users USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY tenant_isolation_policy ON roles USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY tenant_isolation_policy ON role_permissions USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY tenant_isolation_policy ON user_roles USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY tenant_isolation_policy ON user_permissions USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY tenant_isolation_policy ON files USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY tenant_isolation_policy ON tenant_settings USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY tenant_isolation_policy ON tenant_modules USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY tenant_isolation_policy ON employees USING (tenant_id = current_setting('app.current_tenant', true));

-- 4. Specialized Audit Log Policies
DROP POLICY IF EXISTS tenant_isolation_policy ON audit_logs;

CREATE POLICY audit_log_select_policy ON audit_logs
FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY audit_log_insert_policy ON audit_logs
FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
