# Prompt für Claude Code: HR Management System — Task 2b: Zwei DB-User für lokale RLS-Tests

Du arbeitest am HR Management System unter `F:\Projects\hr-management-system`. Task 2 (RLS + `withTenant`) ist teilweise abgeschlossen, aber die Verifikation scheitert an einem lokalen DB-User-Problem.

## Kontext

- PostgreSQL läuft lokal auf `localhost:5432`.
- Aktuell existiert ein Datenbank-User `hrms_user`, der Eigentümer der `hrms_dev`-Datenbank ist.
- In `.env` ist aktuell `DATABASE_URL` und `DIRECT_URL` auf diesen User gesetzt.
- RLS-Policies sind aktiv. Wenn der App-User kein `BYPASSRLS` hat, werden Queries ohne `SET app.current_tenant` korrekt blockiert.
- Für die lokale Entwicklung brauchen wir **zwei separate DB-User**:
  1. **Migration/DDL-User** (z. B. `hrms_user` oder `postgres`) — darf RLS umgehen, um Migrations auszuführen.
  2. **Application-User** (`hrms_app`) — muss `NOBYPASSRLS` haben, damit RLS im echten App-Fluss greift.

## Aufgabe

Richte die zwei DB-User für die lokale Entwicklung ein und konfiguriere `.env` sowie Prisma korrekt.

---

## Schritte

### 1. PostgreSQL-Superuser finden oder anlegen

Prüfe, welche PostgreSQL-Installation auf dem System läuft und wie der Superuser heißt. Typische Fälle:
- Standard-User: `postgres`
- Passwort: evtl. leer, evtl. beim Setup vergeben
- Datenbank: `postgres`
- Port: `5432`

Falls `psql` nicht im PATH ist, nutze `pgAdmin`, `Stack Builder`, oder führe SQL über Node/pg aus.

### 2. App-User `hrms_app` anlegen

Führe als Superuser folgendes SQL aus (`scripts/setup_db_users.sql` existiert bereits):

```sql
CREATE USER hrms_app WITH PASSWORD 'hrms_app_dev_2026';
GRANT CONNECT ON DATABASE hrms_dev TO hrms_app;
GRANT USAGE ON SCHEMA public TO hrms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hrms_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO hrms_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hrms_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO hrms_app;
ALTER USER hrms_app WITH NOBYPASSRLS;
```

Wichtig: Der `hrms_app`-User darf **kein** `BYPASSRLS` haben.

### 3. Owner-User korrigieren

Falls `hrms_user` als Tabelleneigentümer implizit RLS umgeht, stelle sicher, dass er nur für DDL/Migrationen genutzt wird. Der App-User muss der einzige User im laufenden Betrieb sein, der RLS unterliegt.

Optional: Setze auch `hrms_user` auf `NOBYPASSRLS`, damit er nicht aus Versehen RLS umgeht, wenn er für Migrations-Checks verwendet wird.

### 4. `.env` aktualisieren

Ändere `F:\Projects\hr-management-system\.env` wie folgt:

```env
DATABASE_URL=postgresql://hrms_app:hrms_app_dev_2026@localhost:5432/hrms_dev?schema=public
DIRECT_URL=postgresql://hrms_user:***@localhost:5432/hrms_dev?schema=public
```

Ersetze `***` durch das Passwort von `hrms_user`. Frage den Benutzer, wenn das Passwort nicht bekannt ist.

### 5. Prisma-Konfiguration prüfen

Stelle sicher, dass `prisma/schema.prisma` enthält:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Stelle sicher, dass `prisma.config.ts` ebenfalls `directUrl: env("DIRECT_URL")` enthält.

### 6. Prisma-Client und Migrationen testen

Führe aus:

```bash
npx prisma generate
npx prisma migrate status
npx prisma migrate deploy
```

`migrate deploy` muss mit `DIRECT_URL` funktionieren (Owner/Superuser). Der App-User darf **nicht** für Migrations-DDL verwendet werden.

### 7. App-Start testen

Starte die App:

```bash
npm run dev
```

Prüfe:
- Login unter `http://localhost:3002/login` mit `default` / `admin@example.com` / `admin123` funktioniert.
- `/dashboard/employees` ist nach Login erreichbar.
- Ohne Session leitet `/dashboard/employees` weiterhin auf `/login` um.

### 8. Verifikationsskript fixen

Passe `F:\Projects\hr-management-system\scripts\verify-rls.ts` an, damit es:
- Einen Tenant mit `withTenant` erstellt (App-User).
- Einen Employee mit `withTenant` erstellt (App-User).
- Mit einem anderen Tenant-Kontext prüft, dass keine fremden Daten sichtbar sind.
- Einen direkten Zugriff ohne `withTenant` versucht und erwartet, dass RLS blockiert.
- Audit-Log nur einfügen, nicht aktualisieren oder löschen.

Wichtig: Das Skript darf **nicht** mit `DIRECT_URL` laufen, sondern muss den `hrms_app`-User über `DATABASE_URL` verwenden. Nutze `import 'dotenv/config'` und den zentralen `prisma`-Singleton.

### 9. Dokumentation

Ergänze `docs/rls.md` (falls noch nicht vorhanden) mit:
- Wie die DB-User in lokalen Dev eingerichtet sind.
- Unterschied `DATABASE_URL` (App-User, NOBYPASSRLS) vs. `DIRECT_URL` (Owner/Superuser).
- Wie `withTenant` den Tenant-Kontext setzt.
- Wie RLS-Policies funktionieren.
- Wie der Entwickler die zwei User verwendet.

---

## Rahmenbedingungen

- Speichere Dateien ausschließlich auf `F:\`, niemals auf `C:\`.
- Code-Style: einfache `//`-Kommentare, keine XML-Summary-Blöcke, keine TODO-Kommentare.
- Bevorzuge vollständige Datei-Inhalte bei Änderungen.
- Frage beim Benutzer nach Passwörtern oder Superuser-Zugangsdaten, wenn du sie brauchst. Tippe keine Passwörter ein, die der Benutzer nicht explizit nennt.
- Wenn der PostgreSQL-Superuser unbekannt ist, hilf dem Benutzer, ihn über `pgAdmin`, Services-Panel oder `postgresql.conf` zu identifizieren.

---

## Deliverables

- [ ] `hrms_app`-User existiert mit `NOBYPASSRLS`
- [ ] `.env` enthält korrekte `DATABASE_URL` und `DIRECT_URL`
- [ ] `npx prisma generate` und `npx prisma migrate deploy` funktionieren
- [ ] `npm run dev` startet erfolgreich
- [ ] Login mit `default` / `admin@example.com` / `admin123` funktioniert
- [ ] `/dashboard/employees` ohne Session leitet auf `/login` um
- [ ] `scripts/verify-rls.ts` läuft durch und zeigt korrekte RLS-Isolation
- [ ] `docs/rls.md` dokumentiert das Setup
- [ ] `npm run build` bleibt grün

---

Solltest du feststellen, dass der `hrms_app`-User trotz `NOBYPASSRLS` RLS umgeht, weil er Tabelleneigentümer ist, berichte sofort und wir korrigieren das Ownership.
