# Technisch-organisatorische Maßnahmen (TOM) (Art. 32 DSGVO)

Dieses Dokument beschreibt die technischen und organisatorischen Maßnahmen zum Schutz personenbezogener Daten.

## 1. Vertraulichkeit
- **Verschlüsselung:** Einsatz von TLS 1.3 für alle Verbindungen.
- **Passwörter:** Argon2id oder bcrypt mit Cost-Faktor $\ge 12$.
- **Datenzugriff:** Implementierung von PostgreSQL Row-Level Security (RLS) zur strikten Mandantentrennung.
- **Zugriffskontrolle:** Rollenbasiertes Zugriffssystem (RBAC) mit dem Prinzip des "Least Privilege".
- **Sitzungsmanagement:** JWT mit 24h Ablauf und HttpOnly-Secure-Cookies.

## 2. Integrität
- **Audit-Logging:** Append-only Audit-Logs für alle sicherheitsrelevanten Aktionen.
- **Datenvalidierung:** Strikte Input-Validierung mittels Zod-Schemata.
- **Checksummen:** Integritätsprüfung von hochgeladenen Dateien über SHA-256 Checksummen.

## 3. Verfügbarkeit und Belastbarkeit
- **Backup:** Tägliche verschlüsselte Backups der Datenbank.
- **Restore-Tests:** Monatliche Verifizierung der Wiederherstellbarkeit.
- **Infrastructure:** Deployment in redundanten Umgebungen (VPS/S3).

## 4. Organisatorische Maßnahmen
- **Zugriffsberechtigung:** Dokumentation der Zugriffsberechtigung für Administratoren.
- **Schulung:** Regelmäßige Unterweisung der Administratoren in Datenschutzgrundsätzen.
- **AVV:** Abschluss von Auftragsverarbeitungsverträgen mit allen Sub-Processoren (Hosting, Cloud-Storage).

## 5. Verfahren zur Wiederherstellung
- Dokumentierter Restore-Prozess (siehe `docs/backup-restore.md`).
- Definierte RTO (4h) und RPO (24h).
