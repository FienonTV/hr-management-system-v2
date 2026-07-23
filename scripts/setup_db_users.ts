import 'dotenv/config';
import { Pool } from 'pg';
import { readFileSync } from 'fs';

async function main() {
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!directUrl) {
    console.error('DIRECT_URL oder DATABASE_URL fehlt in .env');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: directUrl });
  const sql = readFileSync('./scripts/setup_db_users.sql', 'utf-8');

  try {
    await pool.query(sql);
    console.log('DB-User hrms_app erfolgreich eingerichtet.');
    console.log('DATABASE_URL:', 'postgresql://hrms_app:***@localhost:5432/hrms_dev?schema=public');
    console.log('DIRECT_URL:', directUrl.replace(/:[^:@]*@/, ':****@'));
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Fehler:', error.message);
    } else {
      console.error('Unbekannter Fehler:', error);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
