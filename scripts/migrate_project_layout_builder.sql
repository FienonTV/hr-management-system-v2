-- Project Layout Builder Migration (manual)

-- Add appliesTo check constraint already exists as plain String, just allow project values
-- No schema change needed for CustomFieldDefinition.appliesTo column.

CREATE TABLE IF NOT EXISTS project_layouts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tabs JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT project_layouts_tenant_unique UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS project_layouts_tenant_id_idx ON project_layouts(tenant_id);

CREATE TABLE IF NOT EXISTS project_custom_values (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  definition_id TEXT NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC(12,4),
  value_date TIMESTAMP(3),
  value_boolean BOOLEAN,
  value_json JSONB,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT project_custom_values_unique UNIQUE (tenant_id, project_id, definition_id)
);

CREATE INDEX IF NOT EXISTS project_custom_values_project_idx ON project_custom_values(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS project_custom_values_definition_idx ON project_custom_values(definition_id);

-- Default project custom field definitions
INSERT INTO custom_field_definitions (
  id, tenant_id, applies_to, key, name, description, field_type, is_required, options, sort_order, is_active, created_at, updated_at
)
SELECT
  gen_random_uuid()::TEXT,
  t.id,
  'project',
  def.key,
  def.name,
  def.description,
  def.field_type::custom_field_type,
  false,
  def.options::jsonb,
  def.sort_order,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM tenants t
CROSS JOIN LATERAL (VALUES
  ('status', 'Status', NULL, 'SELECT', '{"values":["PLANNED","ACTIVE","COMPLETED","CANCELLED"]}', 10),
  ('availableForPlanning', 'Für Einsatzplanung freigeben', NULL, 'BOOLEAN', NULL, 20),
  ('startDate', 'Startdatum', NULL, 'DATE', NULL, 30),
  ('endDate', 'Enddatum', NULL, 'DATE', NULL, 40),
  ('customerName', 'Kunde/Auftraggeber', NULL, 'TEXT', NULL, 50),
  ('customerEmail', 'Kunden-E-Mail', NULL, 'TEXT', NULL, 60),
  ('address', 'Projekt-/Baustellenadresse', NULL, 'TEXT', NULL, 70),
  ('budget', 'Budget (€)', NULL, 'NUMBER', NULL, 80),
  ('notes', 'Notizen', NULL, 'TEXT', NULL, 90)
) AS def(key, name, description, field_type, options, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM custom_field_definitions c
  WHERE c.tenant_id = t.id AND c.applies_to = 'project' AND c.key = def.key
);

-- Create default project layout for tenants that don't have one
INSERT INTO project_layouts (tenant_id, tabs)
SELECT t.id,
  jsonb_build_array(
    jsonb_build_object(
      'id', 'tab-1',
      'title', 'Allgemein',
      'sortOrder', 0,
      'cards', jsonb_build_array(
        jsonb_build_object(
          'id', 'card-1',
          'title', 'Basisdaten',
          'columns', 3,
          'sortOrder', 0,
          'fields', jsonb_build_array(
            jsonb_build_object('id', 'field-1', 'definitionId', 'name', 'columnIndex', 0, 'sortOrder', 0),
            jsonb_build_object('id', 'field-2', 'definitionId', 'code', 'columnIndex', 1, 'sortOrder', 1),
            jsonb_build_object('id', 'field-3', 'definitionId', 'description', 'columnIndex', 2, 'sortOrder', 2)
          )
        ),
        jsonb_build_object(
          'id', 'card-2',
          'title', 'Details',
          'columns', 2,
          'sortOrder', 1,
          'fields', jsonb_build_array(
            jsonb_build_object('id', 'field-4', 'definitionId', 'status', 'columnIndex', 0, 'sortOrder', 0),
            jsonb_build_object('id', 'field-5', 'definitionId', 'availableForPlanning', 'columnIndex', 0, 'sortOrder', 1),
            jsonb_build_object('id', 'field-6', 'definitionId', 'startDate', 'columnIndex', 0, 'sortOrder', 2),
            jsonb_build_object('id', 'field-7', 'definitionId', 'endDate', 'columnIndex', 0, 'sortOrder', 3),
            jsonb_build_object('id', 'field-8', 'definitionId', 'customerName', 'columnIndex', 1, 'sortOrder', 4),
            jsonb_build_object('id', 'field-9', 'definitionId', 'customerEmail', 'columnIndex', 1, 'sortOrder', 5),
            jsonb_build_object('id', 'field-10', 'definitionId', 'address', 'columnIndex', 1, 'sortOrder', 6),
            jsonb_build_object('id', 'field-11', 'definitionId', 'budget', 'columnIndex', 1, 'sortOrder', 7),
            jsonb_build_object('id', 'field-12', 'definitionId', 'notes', 'columnIndex', 1, 'sortOrder', 8)
          )
        )
      )
    )
  )
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM project_layouts pl WHERE pl.tenant_id = t.id);
