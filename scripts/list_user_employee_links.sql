SELECT u.email, u.employee_id, e.first_name, e.last_name, e.email AS employee_email
FROM users u
LEFT JOIN employees e ON e.id = u.employee_id
WHERE u.tenant_id = (SELECT id FROM tenants LIMIT 1);
