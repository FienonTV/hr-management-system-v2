# Verfahrensverzeichnis (Art. 30 DSGVO)

Dieses Dokument dient der Dokumentation aller Verarbeitungstätigkeiten personenbezogener Daten innerhalb des HR Management Systems.

## Verantwortlicher
[Firmenname / Admin], [Adresse], [Kontakt-E-Mail]

## Verarbeitungstätigkeiten

| Datenkategorie | Zweck | Rechtsgrundlage | Personenkategorien | Empfänger | Löschfrist |
|---|---|---|---|---|---|
| **Mitarbeiter-Stammdaten** <br>Name, Adresse, Geburtsdatum, E-Mail, Telefon | Personalverwaltung, Vertragserfüllung | Art. 6 (1) b) DSGVO (Vertrag) | Mitarbeiter | Interne Admins, Lohnbuchhaltung | 10 Jahre nach Vertragsende (steuerlich) |
| **Vertragsdokumente** <br>Arbeitsvertrag, Zusatzvereinbarungen | Nachweis, Compliance, rechtliche Pflichten | Art. 6 (1) b), Art. 28 DSGVO | Mitarbeiter | Steuerberater, Rechtsbeistand | 10 Jahre |
| **Abwesenheiten / Urlaub** <br>Urlaubsanträge, Urlaubstage | Urlaubsverwaltung, Kapazitätsplanung | Art. 6 (1) b) DSGVO | Mitarbeiter | HR-Verantwortliche | 2 Jahre nach Kalenderjahr |
| **Krankheitsdaten** <br>AU-Bescheinigungen, Krankheitsdauer | Abwesenheitsnachweis, Lohnfortzahlung | Art. 9 (2) b) DSGVO (Arbeitsrecht) | Mitarbeiter | Krankenkasse, Arzt (nur bei Notwendigkeit) | 3 Jahre |
| **Audit-Logs** <br>Login-Zeitpunkte, IP-Adressen, UserAgent, Aktionen | Sicherheit, Nachweis der Integrität | Art. 6 (1) f) DSGVO (berechtigtes Interesse) | Benutzer | Sicherheitsverantwortlicher | 1 Jahr |
| **Datei-Uploads** <br>Zeugnisse, Zertifikate, Fotos | Dokumentenspeicherung, Qualifikationsnachweis | Art. 6 (1) b) DSGVO | Mitarbeiter | Interne Admins | 10 Jahre |

## Löschkonzept
- **Soft-Delete:** Tenants und Users werden zunächst markiert (`isDeleted`).
- **Grace Period:** 30 Tage Zeitfenster zur Wiederherstellung.
- **Hard-Delete:** Nach Ablauf der Grace Period erfolgt die endgültige Löschung aus der DB und dem Storage.
- **Archivierung:** Steuerlich relevante Daten werden nach Vertragsende in ein Archiv verschoben und nach 10 Jahren gelöscht.
