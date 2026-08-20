SELECT u.email, u.first_name, u.last_name, r.name AS role_name, r."isAdmin"
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
WHERE u.tenant_id = (SELECT id FROM tenants LIMIT 1);
