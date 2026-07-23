-- Setup-Script für HR Management System DB-User
-- Führt aus als Superuser / Datenbank-Owner
-- Zweck: App-User mit NOBYPASSRLS für RLS-Tests anlegen

-- 1. App-User erstellen
CREATE USER hrms_app WITH PASSWORD 'hrms_app_dev_2026';

-- 2. Rechte auf Datenbank
GRANT CONNECT ON DATABASE hrms_dev TO hrms_app;

-- 3. Schema-Rechte
GRANT USAGE ON SCHEMA public TO hrms_app;

-- 4. Tabellenrechte (bestehende Tabellen)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hrms_app;

-- 5. Sequenzen für ID-Generierung
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO hrms_app;

-- 6. Zukünftige Tabellen und Sequenzen automatisch
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hrms_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO hrms_app;

-- 7. WICHTIG: App-User darf RLS NICHT umgehen
ALTER USER hrms_app WITH NOBYPASSRLS;

-- 8. Falls der Owner-User BYPASSRLS hat, entfernen (für realistisches Testen)
-- ALTER USER hrms_user WITH NOBYPASSRLS;
