INSERT INTO permissions (id, key, module, resource, action, description, created_at) VALUES
(gen_random_uuid(), 'employees:read:own', 'employees', 'employee', 'read', 'Eigene Mitarbeiterdaten anzeigen', now()),
(gen_random_uuid(), 'employees:read:all', 'employees', 'employee', 'read', 'Alle Mitarbeiter anzeigen', now()),
(gen_random_uuid(), 'employees:read:public', 'employees', 'employee', 'read', 'Öffentliche Mitarbeiterdaten anzeigen', now()),
(gen_random_uuid(), 'employees:read:personal', 'employees', 'employee', 'read', 'Persönliche Mitarbeiterdaten anzeigen', now()),
(gen_random_uuid(), 'employees:read:contract', 'employees', 'employee', 'read', 'Vertragsdaten anzeigen', now()),
(gen_random_uuid(), 'employees:read:hr_confidential', 'employees', 'employee', 'read', 'HR-vertrauliche Daten anzeigen', now()),
(gen_random_uuid(), 'employees:update:own', 'employees', 'employee', 'update', 'Eigene Mitarbeiterdaten bearbeiten', now()),
(gen_random_uuid(), 'employees:update:all', 'employees', 'employee', 'update', 'Alle Mitarbeiter bearbeiten', now())
ON CONFLICT (key) DO NOTHING;
