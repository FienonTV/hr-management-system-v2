# Prompt für Claude Code: HR Management System — Weiterarbeit

Du übernimmst das HR Management System unter `F:\Projects\hr-management-system`. Das Projekt ist bereits teilweise implementiert. Deine Aufgabe ist es, die nächsten Schritte sauber, architekturkonform und vollständig umzusetzen.

## Projekt-Überblick

Mandantenfähiges HR-Management-System (Multi-Tenant SaaS, zuerst für Schendel GmbH). Strikte Mandantentrennung, granulares Berechtigungsmanagement, audit-sichere Architektur.

## Tech-Stack

- Next.js 14+ App Router
- TypeScript
- Prisma 7.8.0 mit PostgreSQL und `@prisma/adapter-pg`
- NextAuth.js
- Tailwind CSS, Lucide React, shadcn/ui
- Zod für Validierung

## Wichtige Referenzen

Lies vor der Arbeit unbedingt:
- `F:\Obsidian\Hermes\02_Projekte\HR Management System - Architektur Masterplan.md`
- `F:\Obsidian\Hermes\02_Projekte\HR Management System - Core Platform Architektur.md`
- `F:\Obsidian\Hermes\02_Projekte\HR Management System - Tenant-Isolation & Login-Flow.md`
- `F:\Obsidian\Hermes\02_Projekte\HR Management System - Core Prisma Schema.md`
- `F:\Obsidian\Hermes\02_Projekte\HR Management System - Modul-Schnittstelle.md`
- `F:\Obsidian\Hermes\02_Projekte\HR Management System - Security Review.md`
- `F:\Obsidian\Hermes\02_Projekte\HR Management System - DSGVO Konzept.md`

Diese Notizen haben Vorrang vor allgemeinem Wissen. Bei Unklarheiten präzisiere anhand dieser Dokumente.

## Aktueller Stand (bereits vorhanden)

- `prisma/schema.prisma` mit Core-Models: `Tenant`, `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `UserPermission`, `File`, `AuditLog`, `TenantSetting`, `ModuleDefinition`, `TenantModule`, `LoginAttempt`
- `src/lib/db/prisma.ts` mit PrismaPg-Adapter
- `src/lib/actions/auth.ts` mit Mock-Session-Cookie-Login
- `src/app/login/page.tsx` mit Login-Formular
- `src/lib/audit.ts` vorhanden
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/dashboard/employees/page.tsx`, `[id]/page.tsx`, `new/page.tsx`
- `src/lib/actions/employees.ts`
- `src/app/dashboard/layout.tsx`, `page.tsx`

## Kritischer erster Schritt: Schema-Diskrepanz beheben

In `src/lib/actions/employees.ts` und den Dashboard-Seiten wird bereits das Modell `Employee` referenziert. In `prisma/schema.prisma` fehlt das `Employee`-Modell jedoch noch.

**Führe als allererstes durch:**
1. Erweitere `prisma/schema.prisma` um ein passendes `Employee`-Modell mit `tenantId`, den notwendigen Stammdatenfeldern und Relation zu `Tenant`.
2. Führe `prisma migrate dev` und `prisma generate` aus.
3. Aktualisiere das Zod-Schema in `src/lib/actions/employees.ts`, damit es zum Prisma-Modell passt.
4. Stelle sicher, dass `npm run build` fehlerfrei durchläuft und die Mitarbeiterseiten laufen.

## Weitere Aufgaben

### 1. Auth auf NextAuth.js v5 umstellen
- Erstelle / aktualisiere `src/lib/auth.ts` mit Credentials-Provider.
- Login mit `externalId` (Firmen-ID) + E-Mail + Passwort.
- Session-Strategie: JWT, 24h absolut.
- Entferne den Mock-Session-Cookie-Login aus `src/lib/actions/auth.ts` und ersetze ihn durch NextAuth.
- Passe `src/app/login/page.tsx` an NextAuth an.

### 2. Tenant-Isolation via PostgreSQL RLS
- Erstelle RLS-Policies für alle tenant-fähigen Tabellen (`tenants`, `users`, `roles`, `role_permissions`, `user_roles`, `user_permissions`, `files`, `audit_logs`, `tenant_settings`, `tenant_modules`, `employees`).
- Nutze `current_setting('app.current_tenant', true)`.
- Audit-Log append-only: nur `INSERT` und `SELECT`.
- Globale Tabellen ohne RLS: `permissions`, `module_definitions`, `login_attempts`.
- Konfiguriere `url` für Application-DB-User und `directUrl` für Migrations/DDL.
- Stelle `NOBYPASSRLS` für den App-DB-User sicher.

### 3. `withTenant` Wrapper
- Erstelle `src/lib/db/tenant.ts` mit:
  ```typescript
  export async function withTenant<T>(tenantId: string, operation: (tx: PrismaClient) => Promise<T>): Promise<T>
  ```
- Setze `SET LOCAL app.current_tenant = ${tenantId}` innerhalb `prisma.$transaction`.
- Kein `$executeRawUnsafe` mit String-Interpolation.

### 4. Permission-System
- Implementiere `src/lib/permissions.ts` mit:
  - `hasPermission(userId, tenantId, permissionKey)`
  - `withPermission(permissionKey, handler)` als Server Action Wrapper
  - Admin-Rolle hat implizit alle Rechte.
- Berechtigungen nach Namespace `module:resource:action`.
- Default = verweigert.

### 5. Audit-Log vollenden
- Stelle sicher, dass `src/lib/audit.ts` alle Pflicht-Events loggt: Login, Logout, fehlgeschlagene Logins, Passwort-Reset, Berechtigungsänderungen, Employee-CRUD.
- Audit-Log append-only sicherstellen.

### 6. Sicherheitsmaßnahmen
- Passwortrichtlinie: mindestens 12 Zeichen.
- bcrypt mit Cost-Faktor ≥ 12.
- Rate-Limiting auf Login: max 5 Versuche / 15 Min pro IP + E-Mail.
- HttpOnly, Secure, SameSite=Strict Cookies.
- Input-Validierung mit Zod.

### 7. Backup/Restore Konzept
- Erstelle `docs/backup-restore.md` mit Ablauf für tägliches `pg_dump`, verschlüsseltes Sicherungsziel, Restore-Schritten und monatlichem Restore-Test.
- Optional: kleines Backup-Script `scripts/backup-db.sh` (bash-fähig für MSYS).

### 8. DSGVO-Dokumentation anlegen
- `docs/dsgvo/verfahrensverzeichnis.md`
- `docs/dsgvo/tom-katalog.md`
- `docs/dsgvo/avv-muster.md`

## Tests und Verifikation

- Login mit Firmen-ID `default`, E-Mail `admin@example.com`, Passwort `admin123` → 200 OK
- Geschützte Route `/dashboard/employees` → redirect to `/login` ohne Session
- Cross-Tenant-Zugriff wird von RLS blockiert
- Admin-Rolle implizit alle Rechte
- Nicht-Admin-User ohne Recht wird abgelehnt
- `npm run build` erfolgreich

## Rahmenbedingungen

- Keine OAuth/Social-Login.
- Keine externen Cloud-KI-APIs.
- Speichere Dateien ausschließlich auf `F:\` (Ferdinand), niemals auf `C:\`.
- Code-Style: einfache `//`-Kommentare, keine XML-Summary-Blöcke, keine TODO-Kommentare.
- Bevorzuge vollständige Datei-Inhalte bei Änderungen, nicht fragmentierte Snippets.
- Bei architekturrelevanten Abweichungen frage vor der Entscheidung nach.

## Deliverables

- [ ] `Employee`-Modell in `prisma/schema.prisma` + Migration
- [ ] `src/lib/db/tenant.ts` mit `withTenant`
- [ ] `src/lib/auth.ts` mit NextAuth v5
- [ ] `src/lib/permissions.ts` mit `withPermission`
- [ ] Angepasste `src/lib/actions/auth.ts`, `src/app/login/page.tsx`, `src/lib/actions/employees.ts`
- [ ] RLS-Policies als Prisma-Migration
- [ ] Vollständiges Audit-Logging
- [ ] `docs/backup-restore.md`
- [ ] `docs/dsgvo/verfahrensverzeichnis.md`
- [ ] `docs/dsgvo/tom-katalog.md`
- [ ] `docs/dsgvo/avv-muster.md`
- [ ] Erfolgreiches `npm run build`
- [ ] Verifizierte Login-/Redirect-/RLS-/Permission-Tests
