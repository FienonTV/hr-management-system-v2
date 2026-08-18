# Phase 2c — Qualifikationen + Lizenzen

> Für Hermes: Implementiere taskweise. Jede Task = eigener Commit + Build-Check.

**Ziel:** Qualifikationskatalog (`Qualification`) und Mitarbeiter-Qualifikationen (`EmployeeQualification`) mit Zertifikatsupload und Ablauf-Tracking implementieren.

**Tech Stack:** Next.js 15, Prisma, PostgreSQL, shadcn/ui, TypeScript, Zod.

---

## Task 1: Prisma-Schema erweitern

**Files:**
- Modify: `prisma/schema.prisma`

**Schritte:**
1. Füge Modelle hinzu:
   - `Qualification`: `tenantId`, `name`, `issuer`, `description`, `validityInMonths`, `isActive`
   - `EmployeeQualification`: `employeeId`, `qualificationId`, `issuedAt`, `expiresAt`, `certificateFileId`, `notes`
2. Füge Relationen zu `Tenant`, `Employee`, `File` hinzu.
3. Füge RLS-Policies analog bestehender Tabellen hinzu (siehe `rls_policies.sql` Muster).

**Verify:**
```bash
cd /f/Projects/hr-management-system && npx prisma validate
```
Expected: Schema valid.

**Commit:** `git add prisma/schema.prisma && git commit -m "phase-2c: add qualification and employee qualification models"`

---

## Task 2: Migration erstellen

**Files:**
- Create: `prisma/migrations/2026XXXXXX_phase_2c_qualifications/migration.sql` (Prisma generiert automatisch)
- Create: `prisma/migrations/2026XXXXXX_phase_2c_qualifications/rls_policies.sql`

**Schritte:**
1. Migration generieren:
```bash
cd /f/Projects/hr-management-system && npx prisma migrate dev --name phase_2c_qualifications
```
2. Erstelle `rls_policies.sql` mit:
```sql
ALTER TABLE "qualifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qualifications" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qualifications_all ON "qualifications";
CREATE POLICY qualifications_all ON "qualifications"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', true));

ALTER TABLE "employee_qualifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employee_qualifications" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employee_qualifications_all ON "employee_qualifications";
CREATE POLICY employee_qualifications_all ON "employee_qualifications"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true))
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', true));
```
3. Wende RLS manuell an:
```bash
cd /f/Projects/hr-management-system && eval "$(cat .env.local | sed 's/\r$//' | sed 's/^\([A-Za-z_][A-Za-z0-9_]*\)=\(.*\)$/export \1=\2/')" && psql "$DIRECT_URL" -f prisma/migrations/2026XXXXXX_phase_2c_qualifications/rls_policies.sql
```

**Verify:**
```bash
cd /f/Projects/hr-management-system && npx prisma migrate status
```
Expected: Database schema is up to date.

**Commit:** `git add prisma/migrations/ && git commit -m "phase-2c: add qualifications migration and rls"`

---

## Task 3: Seed + Permission-Keys

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `src/modules/config.ts`

**Schritte:**
1. Füge in `seed.ts` hinzu:
   - Permission `qualifications:manage`
   - Standardqualifikationen: „Führerschein Klasse B“, „Staplerschein“
2. Füge in `src/modules/config.ts` im `employeesModule` die Permission `qualifications:manage` und ggf. ein Menüitem hinzu.

**Verify:**
```bash
cd /f/Projects/hr-management-system && npx tsx prisma/seed.ts
```
Expected: Seed completed successfully.

**Commit:** `git add prisma/seed.ts src/modules/config.ts && git commit -m "phase-2c: seed qualifications and permission"`

---

## Task 4: Server Actions Qualifikationskatalog

**Files:**
- Create: `src/lib/actions/qualifications.ts`

**Schritte:**
1. Implementiere:
   - `getQualifications()` — aktive Qualifikationen, `employees:read`
   - `getAllQualifications()` — alle, `qualifications:manage`
   - `createQualification(data)` — `qualifications:manage`
   - `updateQualification(id, data)` — `qualifications:manage`
   - `deleteQualification(id)` — `qualifications:manage`, prüfe ob in Verwendung
2. Audit-Log für create/update/delete.

**Verify:** Build erfolgreich.

**Commit:** `git add src/lib/actions/qualifications.ts && git commit -m "phase-2c: add qualification server actions"`

---

## Task 5: Server Actions Mitarbeiter-Qualifikationen

**Files:**
- Create: `src/lib/actions/employeeQualifications.ts`

**Schritte:**
1. Implementiere:
   - `getEmployeeQualifications(employeeId)` — `employees:read`
   - `createEmployeeQualification(employeeId, data)` — `employees:update`
   - `updateEmployeeQualification(id, data)` — `employees:update`
   - `deleteEmployeeQualification(id)` — `employees:update`
2. Daten: `qualificationId`, `issuedAt`, `expiresAt`, `certificateFileId`, `notes`
3. Zertifikat-Upload: verwende `uploadFile` aus `src/lib/actions/files.ts`, speichere `certificateFileId`
4. Berechne `expiresAt` aus `Qualification.validityInMonths` + `issuedAt`, falls nicht explizit gesetzt.
5. Audit-Log pro Aktion.

**Verify:** Build erfolgreich.

**Commit:** `git add src/lib/actions/employeeQualifications.ts && git commit -m "phase-2c: add employee qualification server actions"`

---

## Task 6: Admin-Seite Qualifikationskatalog

**Files:**
- Create: `src/app/dashboard/modules/admin/qualifications/page.tsx`
- Create: `src/app/dashboard/modules/admin/qualifications/QualificationsClient.tsx`

**Schritte:**
1. Tabelle mit Name, Aussteller, Beschreibung, Gültigkeit (Monate), Aktiv/Inaktiv.
2. Inline-Formular für Neuanlage/Bearbeiten.
3. Löschen nur wenn nicht in Verwendung.
4. Permission-Gate `qualifications:manage`.

**Verify:** Build erfolgreich.

**Commit:** `git add src/app/dashboard/modules/admin/qualifications/ && git commit -m "phase-2c: add qualifications admin page"`

---

## Task 7: Tab „Qualifikationen“ im Mitarbeiter-Detail

**Files:**
- Create: `src/app/dashboard/modules/employees/[id]/QualifikationenTab.tsx`
- Modify: `src/app/dashboard/modules/employees/[id]/page.tsx`
- Modify: `src/app/dashboard/modules/employees/[id]/edit/page.tsx`

**Schritte:**
1. Neue Komponente `QualifikationenTab.tsx`:
   - Liste aller Qualifikationen des Mitarbeiters mit Badge „gültig / ablaufend (weniger als 90 Tage) / abgelaufen“
   - Upload-Button für Zertifikat
   - Formular zum Hinzufügen/Bearbeiten (Qualifikation-Auswahl, Ausstellungsdatum, Ablaufdatum, Notizen)
2. Füge Tab „Qualifikationen“ in `page.tsx` und `edit/page.tsx` hinzu.
3. Lade Daten via `getEmployeeQualifications` im Client (Client Component).

**Verify:** Build erfolgreich.

**Commit:** `git add src/app/dashboard/modules/employees/[id]/ && git commit -m "phase-2c: add employee qualifications tab"`

---

## Task 8: Dashboard-Widget für ablaufende Qualifikationen

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Create: `src/components/dashboard/ExpiringQualificationsWidget.tsx`

**Schritte:**
1. Server Action `getExpiringQualifications(days = 90)` in `src/lib/actions/employeeQualifications.ts`
2. Widget zeigt Liste mit Mitarbeiter-Name, Qualifikations-Name, Ablaufdatum, Link zur Mitarbeiter-Detailseite.
3. Nur bei `employees:read` anzeigen.

**Verify:** Build erfolgreich.

**Commit:** `git add src/ && git commit -m "phase-2c: add expiring qualifications dashboard widget"`

---

## Task 9: Admin-Menü erweitern

**Files:**
- Modify: `src/modules/config.ts`

**Schritte:**
1. Füge Menüitem „Qualifikationen“ unter Admin oder Mitarbeiter-Modul hinzu:
   `{ id: "qualifications", label: "Qualifikationen", path: "/dashboard/modules/admin/qualifications", iconKey: "Award", requiredPermission: "qualifications:manage" }`
2. Füge `Award` zu `ICON_MAP` in `src/components/layout/Sidebar.tsx` hinzu.

**Verify:** Build erfolgreich.

**Commit:** `git add src/modules/config.ts src/components/layout/Sidebar.tsx && git commit -m "phase-2c: add qualifications menu entry and icon"`

---

## Task 10: Abschließender Build + Server-Start + Smoke-Test

**Schritte:**
1. Alten Dev-Server beenden, `.next` löschen, builden:
```bash
cd /f/Projects/hr-management-system && rm -rf .next && npx next build
```
2. Dev-Server starten:
```bash
cd /f/Projects/hr-management-system && eval "$(cat .env.local | sed 's/\r$//' | sed 's/^\([A-Za-z_][A-Za-z0-9_]*\)=\(.*\)$/export \1=\2/')" && npx next dev --port 3000
```
3. Smoke-Test: Login, Mitarbeiter-Detail, Qualifikationen-Tab, Admin-Qualifikationen.

**Commit:** falls nötig `git commit -m "phase-2c: final build and smoke test fixes"`

---

## Offen / Optional
- Führerschein-/Staplerschein-spezifische Logik ist implizit über Standardqualifikationen abgedeckt.
- Kalender + Abwesenheiten folgen in Phase 2d.
