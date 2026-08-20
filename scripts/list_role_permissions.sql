SELECT r.name AS role_name, p.key AS permission_key, p.description
FROM roles r
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.tenant_id = (SELECT id FROM tenants LIMIT 1)
ORDER BY r.name, p.key;
