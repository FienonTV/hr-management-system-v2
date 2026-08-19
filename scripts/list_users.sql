SELECT u.id, u.email, r.name AS role, t.name AS tenant
FROM users u
JOIN tenants t ON u.tenant_id = t.id
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
ORDER BY t.name, u.email;
