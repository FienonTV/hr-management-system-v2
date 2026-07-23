# Backup & Restore Konzept

Dieses Dokument beschreibt die Strategie zur Sicherung und Wiederherstellung der Daten des HR Management Systems.

## 1. Ziele (SLA)
- **RPO (Recovery Point Objective):** Max. 24 Stunden (Tägliches Backup).
- **RTO (Recovery Time Objective):** Max. 4 Stunden bis zur Wiederherstellung des Grundbetriebs.

## 2. Backup-Strategie
### 2.1 Datenbank (PostgreSQL)
- **Methode:** Täglicher Full-Dump mittels `pg_dump`.
- **Intervall:** Einmal täglich (z. B. 02:00 Uhr lokal).
- **Aufbewahrungsfrist:** 30 Tage tägliche Backups, 12 monatliche Archive.

### 2.2 Dateien (S3 / MinIO)
- **Methode:** Versioning in S3 aktiviert + täglicher Export kritischer Dokumente.
- **Intervall:** Tägliche Synchronisation.

### 2.3 Konfiguration & Secrets
- **Methode:** Versionierung der `.env.example` und Sicherung der produktiven `.env` in einem verschlüsselten Passwort-Manager (z. B. Bitwarden / Vault).

## 3. Sicherheit & Verschlüsselung
- **Encryption-at-Rest:** Alle Backups werden vor der Speicherung mittels AES-256 verschlüsselt (z. B. via `gpg` oder `age`).
- **Offsite-Speicherung:** Backups werden auf ein separates, physisch getrenntes Medium oder in einen verschlüsselten Cloud-Storage übertragen.

## 4. Restore-Prozess
### 4.1 Wiederherstellung der DB
1. Neue PostgreSQL-Instanz starten.
2. Backup-Datei entschlüsseln.
3. Restore via `psql` oder `pg_restore`.
4. Prisma Migrationen validieren.
5. App-Server neu starten.

### 4.2 Verifikation (Restore-Test)
- **Turnus:** Einmal pro Monat.
- **Vorgehen:** Wiederherstellung eines zufälligen Backups in einer isolierten Test-Umgebung.
- **Prüfung:** Stichprobenartige Kontrolle der Datenintegrität und Funktionsprüfung des Logins.

## 5. Automatisierung
Das Backup wird über ein Cron-Job/Task-Scheduler gesteuert, welcher das Script `scripts/backup-db.sh` aufruft.
