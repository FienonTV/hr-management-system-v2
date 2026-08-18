# Phase 2a — Mitarbeiterstammdaten professionalisieren

> Für Hermes: Implementiere taskweise. Jede Task = eigener Commit + Build-Check.

**Ziel:** `Department`, `Position`, `PayGrade` als echte Tabellen einführen, weitere Mitarbeiterfelder ergänzen, CSV-Export ermöglichen. Custom Fields bleibt für später in Phase 2a optional, falls Zeit ist.

**Tech Stack:** Next.js 15, Prisma, PostgreSQL, shadcn/ui, TypeScript, Zod.

---

## Task 1: Prisma-Schema erweitern

**Files:**
- Modify: `prisma/schema.prisma`

**Schritte:**
1. Füge Modelle `Department`, `Position`, `PayGrade` hinzu (jeweils `tenantId`, `name`, `code`, `description`, `isActive`; `Department` zusätzlich optional `managerId`).
2. Ergänze `Employee`:
   - `departmentId String?` + Relation
   - `positionId String?` + Relation
   - `payGradeId String?` + Relation
   - Neue Felder: `hourlyWage Decimal?`, `vacationDays Int?`, `probationEndDate DateTime?`, `fixedTermEndDate DateTime?`, `keyNumber String?`, `chipNumber String?`, `driverLicenseClasses String[]`, `forkliftLicense Boolean @default(false)`
3. Füge RLS-Policies für `Department`, `Position`, `PayGrade` analog bestehender Tabellen hinzu.
4. Füge neue Module `departments`, `positions`, `payGrades` in `ModuleDefinition` optional seedbar hinzu (siehe bestehende Module wie `documents`).

**Verify:**
```bash
cd /f/Projects/hr-management-system && npx prisma validate
```
Expected: Schema valid.

**Commit:** `git add prisma/schema.prisma && git commit -m "phase-2a: add department, position, paygrade and extended employee fields"`

---

## Task 2: Migration erstellen

**Files:**
- Create: `prisma/migrations/2026XXXXXX_phase_2a_employee_master_data/migration.sql` (Prisma generiert Dateien automatisch)

**Schritte:**
1. Führe aus:
```bash
cd /f/Projects/hr-management-system && npx prisma migrate dev --name phase_2a_employee_master_data
```
2. Prüfe die generierte Migration auf korrekte RLS-Policies und Indizes.
3. Stelle sicher, dass alte `Employee.department` und `Employee.position` String-Felder entfernt werden. Prisma-Migration muss Datenverlust akzeptieren oder ein SQL-Skript migriert Werte vor dem Löschen.

**Verify:**
```bash
cd /f/Projects/hr-management-system && npx prisma generate && npx prisma db pull --print | head
```
Expected: DB-Schema passt zum Prisma-Schema.

**Commit:** `git add prisma/migrations/ && git commit -m "phase-2a: add migration for employee master data"`

---

## Task 3: Seed-Daten + Permission-Keys

**Files:**
- Modify: `prisma/seed.ts`

**Schritte:**
1. Füge Permission-Keys hinzu:
   - `departments:manage`
   - `positions:manage`
   - `payGrades:manage`
   - `employees:export`
   - `employees:update` (falls noch nicht vorhanden)
2. Seed Standard-Abteilungen und Positionen (z. B. „Geschäftsführung“, „Büro“, „Montage“, „Lager“).
3. Erstelle Module-Einträge für `departments`, `positions`, `payGrades` in `ModuleDefinition`.

**Verify:**
```bash
cd /f/Projects/hr-management-system && npx tsx prisma/seed.ts
```
Expected: Seed läuft ohne Fehler.

**Commit:** `git add prisma/seed.ts && git commit -m "phase-2a: seed departments, positions, paygrades and permissions"`

---

## Task 4: Admin-Seite /departments

**Files:**
- Create: `src/lib/actions/departments.ts`
- Create: `src/app/dashboard/modules/admin/departments/page.tsx`
- Create: `src/app/dashboard/modules/admin/departments/DepartmentsClient.tsx`

**Schritte:**
1. Server Actions: `getDepartments()`, `createDepartment(formData)`, `updateDepartment(id, formData)`, `deleteDepartment(id)` mit `departments:manage` Permission.
2. Client: Tabelle mit Name, Code, Beschreibung, Manager (optional), Aktiv/Inaktiv. Inline-Formular für Neuanlage, Edit-Modal oder inline-Edit pro Zeile.
3. Manager-Auswahl: Dropdown aller Mitarbeiter des Tenants (nur Name, optional).

**Verify:**
```bash
cd /f/Projects/hr-management-system && npx next build
```
Expected: Build erfolgreich.

**Commit:** `git add src/ && git commit -m "phase-2a: add departments admin crud"`

---

## Task 5: Admin-Seite /positions

**Files:**
- Create: `src/lib/actions/positions.ts`
- Create: `src/app/dashboard/modules/admin/positions/page.tsx`
- Create: `src/app/dashboard/modules/admin/positions/PositionsClient.tsx`

**Schritte:**
1. Analog Task 4, aber ohne Manager.
2. Felder: Name, Code, Beschreibung, Aktiv/Inaktiv.

**Verify:** Build erfolgreich.

**Commit:** `git add src/ && git commit -m "phase-2a: add positions admin crud"`

---

## Task 6: Admin-Seite /pay-grades

**Files:**
- Create: `src/lib/actions/payGrades.ts`
- Create: `src/app/dashboard/modules/admin/pay-grades/page.tsx`
- Create: `src/app/dashboard/modules/admin/pay-grades/PayGradesClient.tsx`

**Schritte:**
1. Analog Task 5 mit zusätzlichem `tariffGroup` Feld.

**Verify:** Build erfolgreich.

**Commit:** `git add src/ && git commit -m "phase-2a: add pay grades admin crud"`

---

## Task 7: Mitarbeiter-Formular auf neue IDs umstellen

**Files:**
- Modify: `src/lib/schemas/employees.ts`
- Modify: `src/lib/actions/employees.ts`
- Modify: `src/app/dashboard/modules/employees/[id]/StammdatenTab.tsx`
- Modify: `src/app/dashboard/modules/employees/[id]/ReadOnlyStammdaten.tsx`
- Modify: `src/app/dashboard/modules/employees/new/page.tsx`
- Modify: `src/app/dashboard/modules/employees/page.tsx` (Filter-Optionen)

**Schritte:**
1. Ersetze String-Felder `department` und `position` durch `departmentId` und `positionId` (optional).
2. Füge `payGradeId` sowie neue Felder (`hourlyWage`, `vacationDays`, `probationEndDate`, `fixedTermEndDate`, `keyNumber`, `chipNumber`, `driverLicenseClasses`, `forkliftLicense`) dem Zod-Schema hinzu.
3. Server Action `createEmployee` / `updateEmployee` muss die neuen Felder akzeptieren und speichern.
4. Im Formular: Dropdowns für Abteilung/Position/Entgeltgruppe mit Daten aus Server Actions. „Neu anlegen“-Option für Abteilung optional.
5. Detailansicht zeigt neue Abschnitte / Felder an.
6. Mitarbeiter-Liste Filter für Abteilung/Position auf echte IDs umstellen.

**Verify:**
```bash
cd /f/Projects/hr-management-system && npx next build
```
Expected: Build erfolgreich, keine TypeScript-Fehler.

**Commit:** `git add src/ && git commit -m "phase-2a: wire department, position, paygrade and new fields into employee forms"`

---

## Task 8: CSV-Export Mitarbeiter-Liste

**Files:**
- Create: `src/lib/actions/employeeExport.ts`
- Modify: `src/app/dashboard/modules/employees/page.tsx`
- Modify: `src/app/dashboard/modules/employees/EmployeesClient.tsx`

**Schritte:**
1. Server Action `exportEmployeesCsv(filters, sort)`:
   - Lädt gefilterte/sortierte Mitarbeiter inkl. Abteilung/Position (Namen).
   - Generiert CSV mit Spalten: Mitarbeiternummer, Name, E-Mail, Position, Abteilung, Status, Eintrittsdatum, Telefon, Geburtsdatum.
   - Encodiere als UTF-8 mit BOM für Excel.
   - Rückgabe als `Buffer`/`Uint8Array` oder Base64; Client lädt herunter.
2. Permission `employees:export` prüfen.
3. Button in Mitarbeiter-Liste neben Suchfeld/Filter.

**Verify:**
```bash
cd /f/Projects/hr-management-system && npx next build
```
Expected: Build erfolgreich.

**Commit:** `git add src/ && git commit -m "phase-2a: add employee csv export"`

---

## Task 9: Admin-Menü erweitern

**Files:**
- Modify: `src/components/layout/Sidebar.tsx` oder entsprechende Navigationsdatei

**Schritte:**
1. Füge Unterpunkte unter „Admin“ hinzu:
   - Abteilungen → `/dashboard/modules/admin/departments`
   - Positionen → `/dashboard/modules/admin/positions`
   - Entgeltgruppen → `/dashboard/modules/admin/pay-grades`
2. Zeige Menüpunkte nur bei entsprechenden Permissions.

**Verify:** Build erfolgreich.

**Commit:** `git add src/ && git commit -m "phase-2a: add admin menu entries for departments, positions, pay grades"`

---

## Task 10: Abschließender Build + Server-Start + Smoke-Test

**Schritte:**
1. Alten Dev-Server beenden, `.next` löschen:
```bash
cd /f/Projects/hr-management-system && rm -rf .next
```
2. Build:
```bash
cd /f/Projects/hr-management-system && npx next build
```
3. Dev-Server starten:
```bash
cd /f/Projects/hr-management-system && eval "$(cat .env.local | sed 's/\r$//' | sed 's/^\([A-Za-z_][A-Za-z0-9_]*\)=\(.*\)$/export \1=\2/')" && npx next dev --port 3000
```
4. Smoke-Test mit Python/requests: Login, Mitarbeiter-Liste, Admin-Seiten aufrufen.

**Verify:**
- `npx next build` exit 0
- Server antwortet auf `http://localhost:3000`
- Admin-Seiten aufrufbar

**Commit:** `git commit -m "phase-2a: final build and smoke test fixes"` (falls nötig)

---

## Offen / Optional
- Custom Fields (Task 11–14) erst nach Abschluss der Tasks 1–10, falls gewünscht.
- Datenmigration alter `department`/`position` String-Werte in echte Tabellen ggf. per SQL-Skript nach dem Deploy.
