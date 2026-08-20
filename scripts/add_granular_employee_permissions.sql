-- Remove old vague field-group permissions (if present)
DELETE FROM permissions WHERE key IN (
  'employees:read:public',
  'employees:read:personal',
  'employees:read:contract',
  'employees:read:hr_confidential',
  'employees:update:own',
  'employees:update:all'
);

-- Insert new granular field-group permissions
INSERT INTO permissions (id, key, module, resource, action, description, created_at)
VALUES
  (gen_random_uuid(), 'employees:read:personal_info:own', 'employees', 'employee', 'read', 'Persönliche Daten (eigene) anzeigen', now()),
  (gen_random_uuid(), 'employees:read:personal_info:all', 'employees', 'employee', 'read', 'Persönliche Daten (alle) anzeigen', now()),
  (gen_random_uuid(), 'employees:update:personal_info:own', 'employees', 'employee', 'update', 'Persönliche Daten (eigene) bearbeiten', now()),
  (gen_random_uuid(), 'employees:update:personal_info:all', 'employees', 'employee', 'update', 'Persönliche Daten (alle) bearbeiten', now()),

  (gen_random_uuid(), 'employees:read:employment:own', 'employees', 'employee', 'read', 'Beschäftigung (eigene) anzeigen', now()),
  (gen_random_uuid(), 'employees:read:employment:all', 'employees', 'employee', 'read', 'Beschäftigung (alle) anzeigen', now()),
  (gen_random_uuid(), 'employees:update:employment:own', 'employees', 'employee', 'update', 'Beschäftigung (eigene) bearbeiten', now()),
  (gen_random_uuid(), 'employees:update:employment:all', 'employees', 'employee', 'update', 'Beschäftigung (alle) bearbeiten', now()),

  (gen_random_uuid(), 'employees:read:address:own', 'employees', 'employee', 'read', 'Adresse (eigene) anzeigen', now()),
  (gen_random_uuid(), 'employees:read:address:all', 'employees', 'employee', 'read', 'Adresse (alle) anzeigen', now()),
  (gen_random_uuid(), 'employees:update:address:own', 'employees', 'employee', 'update', 'Adresse (eigene) bearbeiten', now()),
  (gen_random_uuid(), 'employees:update:address:all', 'employees', 'employee', 'update', 'Adresse (alle) bearbeiten', now()),

  (gen_random_uuid(), 'employees:read:bank_tax:own', 'employees', 'employee', 'read', 'Bankverbindung & Steuer (eigene) anzeigen', now()),
  (gen_random_uuid(), 'employees:read:bank_tax:all', 'employees', 'employee', 'read', 'Bankverbindung & Steuer (alle) anzeigen', now()),
  (gen_random_uuid(), 'employees:update:bank_tax:own', 'employees', 'employee', 'update', 'Bankverbindung & Steuer (eigene) bearbeiten', now()),
  (gen_random_uuid(), 'employees:update:bank_tax:all', 'employees', 'employee', 'update', 'Bankverbindung & Steuer (alle) bearbeiten', now()),

  (gen_random_uuid(), 'employees:read:emergency:own', 'employees', 'employee', 'read', 'Notfallkontakt (eigene) anzeigen', now()),
  (gen_random_uuid(), 'employees:read:emergency:all', 'employees', 'employee', 'read', 'Notfallkontakt (alle) anzeigen', now()),
  (gen_random_uuid(), 'employees:update:emergency:own', 'employees', 'employee', 'update', 'Notfallkontakt (eigene) bearbeiten', now()),
  (gen_random_uuid(), 'employees:update:emergency:all', 'employees', 'employee', 'update', 'Notfallkontakt (alle) bearbeiten', now()),

  (gen_random_uuid(), 'employees:read:hr_misc:own', 'employees', 'employee', 'read', 'HR-Sonstiges (eigene) anzeigen', now()),
  (gen_random_uuid(), 'employees:read:hr_misc:all', 'employees', 'employee', 'read', 'HR-Sonstiges (alle) anzeigen', now()),
  (gen_random_uuid(), 'employees:update:hr_misc:own', 'employees', 'employee', 'update', 'HR-Sonstiges (eigene) bearbeiten', now()),
  (gen_random_uuid(), 'employees:update:hr_misc:all', 'employees', 'employee', 'update', 'HR-Sonstiges (alle) bearbeiten', now())
ON CONFLICT (key) DO NOTHING;
