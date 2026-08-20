ALTER TABLE projects ADD COLUMN IF NOT EXISTS available_for_planning BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_projects_available_for_planning ON projects(tenant_id, available_for_planning);
