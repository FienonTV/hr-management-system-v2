INSERT INTO permissions (id, key, module, resource, action, description)
VALUES
  (gen_random_uuid()::TEXT, 'projectLayout:read', 'projects', 'project_layout', 'read', 'Projekt-Layout anzeigen'),
  (gen_random_uuid()::TEXT, 'projectLayout:update', 'projects', 'project_layout', 'update', 'Projekt-Layout bearbeiten')
ON CONFLICT (key) DO NOTHING;

-- Assign to Admin role if not already
INSERT INTO role_permissions (id, role_id, permission_id, tenant_id)
SELECT gen_random_uuid()::TEXT, r.id, p.id, r.tenant_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin' AND p.key IN ('projectLayout:read', 'projectLayout:update')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Assign read to Manager role if exists
INSERT INTO role_permissions (id, role_id, permission_id, tenant_id)
SELECT gen_random_uuid()::TEXT, r.id, p.id, r.tenant_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager' AND p.key = 'projectLayout:read'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
