# Prompt für Claude Code: HR Management System — Task 2: PostgreSQL RLS + withTenant Wrapper

Du arbeitest weiter am HR Management System unter `F:\Projects\hr-management-system`. Task 1 (NextAuth v5 mit mandantenspezifischem Login) ist abgeschlossen.

**Aufgabe:** Implementiere Task 2: PostgreSQL Row-Level Security (RLS) mit tenant-isoliertem `withTenant` Wrapper.

---

## Projekt-Überblick

Mandantenfähiges HR-Management-System (Multi-Tenant SaaS, zuerst für Schendel GmbH). Strikte Mandantentrennung, granulares Berechtigungsmanagement, audit-sichere Architektur.

## Tech-Stack

- Next.js 14+ App Router
- TypeScript
- Prisma 7.8.0 mit PostgreSQL und `@prisma/adapter-pg`
- NextAuth.js v5
- Tailwind CSS, Lucide React, shadcn/ui
- Zod für Validierung

## Wichtige Referenzen

Lies vor der Arbeit unbedingt:
- `F:\Obsidian\Hermes\02_Projekte\HR Management System - Architektur Masterplan.md`
- `F:\Obsidian\Hermes\02_Projekte\HR Management System - Core Platform Architektur.md`
- `F:\Obsidian\Hermes\02_Projekte\HR Management System - Tenant-Isolation & Login-Flow.md`
- `F:\Obsidian\Hermes\02_Projekte\HR Management System - Core Prisma Schema.md`
- `F:\Obsidian\Hermes\02_Projekte\HR Management System - Security Review.md`

Diese Notizen haben Vorrang vor allgemeinem Wissen. Bei Unklarheiten präzisiere anhand dieser Dokumente.

---

## Aktueller Stand

- `prisma/schema.prisma` enthält Core-Models: `Tenant`, `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `UserPermission`, `File`, `AuditLog`, `TenantSetting`, `ModuleDefinition`, `TenantModule`, `LoginAttempt`, `Employee`
- `src/lib/db/prisma.ts` mit PrismaPg-Adapter und Pool
- `src/lib/auth.ts` mit NextAuth v5 Credentials-Provider
- `src/middleware.ts` mit auth-guard
- `src/lib/audit.ts` existiert bereits
- Login funktioniert mit Firmen-ID `default`, E-Mail `admin@example.com`, Passwort `admin123`
- `npm run build` ist grün

---

## Konkrete Aufgaben

### 1. `withTenant` Wrapper implementieren

Erstelle `src/lib/db/tenant.ts`:

```typescript
export async function withTenant<T>(
  tenantId: string,
  operation: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL app.current_tenant = ${tenantId}`;
    return operation(tx);
  });
}
```

Anforderungen:
- Verwende ausschließlich `tx.$executeRaw` mit Template-Tag.
- Kein `$executeRawUnsafe` mit String-Interpolation.
- `SET LOCAL` muss innerhalb der Transaktion gesetzt werden.
- Exportiere zusätzlich einen Helper `getEffectiveTenantId(session)` in `src/lib/session.ts`, der `session.impersonatedTenantId ?? session.tenantId` zurückgibt.

### 2. Datenbank-User für RLS vorbereiten

- Stelle sicher, dass `prisma/schema.prisma` zwei URLs verwendet:
  - `url = env("DATABASE_URL")` für den Application-User mit `NOBYPASSRLS`
  - `directUrl = env("DIRECT_URL")` für Migrationen/DDL
- Prüfe, ob `.env` bereits `DATABASE_URL` und `DIRECT_URL` enthält. Falls nicht, ergänze sie. Lese dazu `.env.example` oder frag nach, wenn du unsicher bist.
- Für diesen lokalen Dev-Schritt kannst du vorerst denselben DB-User für beide URLs verwenden, **aber dokumentiere**, dass in Produktion `DATABASE_URL` ein `NOBYPASSRLS`-User sein muss.

### 3. RLS-Policies für alle tenant-fähigen Tabellen

Erstelle eine Prisma-Migration (z. B. `prisma/migrations/20240712_add_rls/migration.sql`) mit RLS-Policies für:

- `tenants`
- `users`
- `roles`
- `role_permissions`
- `user_roles`
- `user_permissions`
- `files`
- `audit_logs`
- `tenant_settings`
- `tenant_modules`
- `employees`

Vorgaben:
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE ... FORCE ROW LEVEL SECURITY;`
- Policies prüfen: `tenant_id = current_setting('app.current_tenant', true)`
- Audit-Log append-only: nur `INSERT` und `SELECT` erlauben, kein `UPDATE`/`DELETE`
- Für `tenants`: Benutzer sieht nur den eigenen Tenant (`id = current_setting('app.current_tenant')`)
- Globale Tabellen ohne RLS: `permissions`, `module_definitions`, `login_attempts`

### 4. Bestehende Code-Stellen auf `withTenant` umstellen

Gehe systematisch durch:
- `src/lib/actions/auth.ts` — Login-Aufrufe müssen Tenant-Kontext korrekt setzen, wo nötig
- `src/lib/actions/employees.ts` — alle Employee-Queries/Mutations müssen über `withTenant` laufen
- `src/lib/audit.ts` — Audit-Log-Schreibvorgänge müssen `withTenant` nutzen
- Weitere Server Actions, die direkt `prisma` verwenden

Ersetze direkte `prisma.model.xxx()` Aufrufe durch `withTenant(tenantId, tx => tx.model.xxx(...))`, wo tenant-isolierte Daten betroffen sind.

### 5. Tenant-Kontext aus Session beziehen

- Erstelle einen zentralen Helper `src/lib/session.ts` mit:
  - `getSession()` aus `next-auth/react` für Client Components
  - `auth()` aus `src/lib/auth.ts` für Server Actions
  - `getEffectiveTenantId(session)`
- Alle Server Actions, die tenant-isolierte Daten anfassen, müssen den effektiven Tenant aus der Session holen.

### 6. Tests und Verifikation

Erstelle ein Verifikationsskript `scripts/verify-rls.ts` oder ähnlich, das Folgendes prüft:

- Mit `withTenant(tenantA)` werden nur Daten von Tenant A gelesen.
- Mit `withTenant(tenantB)` werden keine Daten von Tenant A sichtbar.
- Ein direkter `prisma`-Zugriff ohne `withTenant` liefert keine tenant-isolierten Datensätze (außer `tenants` selbst, falls keine globale Transaktion läuft).
- Audit-Log lässt sich nur einfügen, nicht aktualisieren oder löschen.
- `npm run build` bleibt grün.
- Login mit `default` / `admin@example.com` / `admin123` funktioniert weiterhin.
- `/dashboard/employees` ohne Session leitet weiterhin auf `/login` um.
- Mit Session ist `/dashboard/employees` erreichbar und zeigt nur Mitarbeiter des eigenen Tenants.

### 7. Dokumentation

Ergänze `docs/rls.md` mit:
- Welche Tabellen RLS haben
- Welche global sind
- Wie `withTenant` funktioniert
- Wie RLS in lokalen Tests geprüft wird
- Hinweis auf `DATABASE_URL` vs `DIRECT_URL`

---

## Rahmenbedingungen

- Keine OAuth/Social-Login.
- Keine externen Cloud-KI-APIs.
- Speichere Dateien ausschließlich auf `F:\` (Ferdinand), niemals auf `C:\`.
- Code-Style: einfache `//`-Kommentare, keine XML-Summary-Blöcke, keine TODO-Kommentare.
- Bevorzuge vollständige Datei-Inhalte bei Änderungen, nicht fragmentierte Snippets.
- Bei architekturrelevanten Abweichungen frage vor der Entscheidung nach.

---

## Deliverables

- [ ] `src/lib/db/tenant.ts` mit `withTenant`
- [ ] `src/lib/session.ts` mit `getEffectiveTenantId`
- [ ] Prisma-Migration mit RLS-Policies
- [ ] `prisma/schema.prisma` mit `directUrl` konfiguriert
- [ ] Bestehende Server Actions auf `withTenant` umgestellt
- [ ] `src/lib/audit.ts` nutzt `withTenant`
- [ ] `scripts/verify-rls.ts` oder gleichwertige Verifikation
- [ ] `docs/rls.md`
- [ ] Erfolgreiches `npm run build`
- [ ] Login, Redirect und Tenant-Isolation verifiziert

---

Sollten NextAuth v5, PrismaPg-Adapter und RLS im Zusammenspiel Probleme machen (z. B. `SET LOCAL` im Adapter-Kontext), berichte sofort und wir passen die Strategie an.
