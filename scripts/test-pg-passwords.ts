import { Pool } from 'pg';

const passwords = ['admin123', 'admin', 'admin1234'];

async function main() {
  let workingPool: Pool | null = null;
  for (const pw of passwords) {
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: pw,
      database: 'postgres',
      connectionTimeoutMillis: 3000,
    });
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT current_user');
      console.log('Connected as:', result.rows[0].current_user);
      client.release();
      workingPool = pool;
      break;
    } catch {
      await pool.end();
    }
  }

  if (!workingPool) {
    console.log('No password matched');
    process.exit(1);
  }

  const client = await workingPool.connect();
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
    await workingPool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
