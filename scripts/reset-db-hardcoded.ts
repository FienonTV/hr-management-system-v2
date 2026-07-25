import { Pool } from 'pg';

async function main() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'admin123',
    database: 'postgres',
    connectionTimeoutMillis: 5000,
  });
  const client = await pool.connect();
  console.log('Connected as:', (await client.query('SELECT current_user')).rows[0].current_user);
  try {
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname IN ('hrms_dev', 'hrms_shadow') AND pid <> pg_backend_pid();
    `);
    await client.query('DROP DATABASE IF EXISTS hrms_dev');
    await client.query('DROP DATABASE IF EXISTS hrms_shadow');

    await client.query('CREATE DATABASE hrms_dev OWNER hrms_user');
    await client.query('CREATE DATABASE hrms_shadow OWNER hrms_user');

    console.log('Datenbanken hrms_dev und hrms_shadow als hrms_user neu erstellt.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
