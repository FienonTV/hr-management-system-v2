SELECT
  u.id AS user_id,
  u.email,
  u.employee_id,
  e.id AS employee_id_from_emp,
  e.first_name,
  e.last_name,
  e.email AS employee_email
FROM users u
LEFT JOIN employees e ON e.id = u.employee_id
WHERE u.email = 'simonwidansk@outlook.de';
