INSERT INTO permissions (id, key, module, resource, action, description)
VALUES
  (gen_random_uuid()::TEXT, 'projectCustomFields:read', 'projects', 'project_custom_fields', 'read', 'Projekt-Custom-Fields anzeigen'),
  (gen_random_uuid()::TEXT, 'projectCustomFields:update', 'projects', 'project_custom_fields', 'update', 'Projekt-Custom-Fields bearbeiten')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (id, role_id, permission_id, tenant_id)
SELECT gen_random_uuid()::TEXT, r.id, p.id, r.tenant_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin' AND p.key IN ('projectCustomFields:read', 'projectCustomFields:update')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO role_permissions (id, role_id, permission_id, tenant_id)
SELECT gen_random_uuid()::TEXT, r.id, p.id, r.tenant_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager' AND p.key = 'projectCustomFields:read'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
