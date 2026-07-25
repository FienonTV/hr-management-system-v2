import { Pool } from 'pg';

const passwords = ['admin123', 'admin', 'admin1234'];

async function connectWithRetry(database: string): Promise<Pool> {
  for (const pw of passwords) {
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: pw,
      database,
      connectionTimeoutMillis: 3000,
    });
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT current_user');
      console.log(`Connected to ${database} as:`, result.rows[0].current_user);
      client.release();
      return pool;
    } catch {
      await pool.end();
    }
  }
  throw new Error(`No password matched for database ${database}`);
}

async function setupDatabase(dbName: string) {
  const pool = await connectWithRetry(dbName);
  const client = await pool.connect();
  try {
    await client.query('GRANT ALL ON SCHEMA public TO hrms_user');
    await client.query('GRANT ALL ON SCHEMA public TO hrms_app');
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hrms_user');
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hrms_app');
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO hrms_user');
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO hrms_app');
    console.log(`Schema-Rechte für ${dbName} gesetzt.`);
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  const postgresPool = await connectWithRetry('postgres');
  const postgresClient = await postgresPool.connect();
  try {
    await postgresClient.query('GRANT ALL PRIVILEGES ON DATABASE hrms_dev TO hrms_user');
    await postgresClient.query('GRANT ALL PRIVILEGES ON DATABASE hrms_dev TO hrms_app');
    await postgresClient.query('GRANT ALL PRIVILEGES ON DATABASE hrms_shadow TO hrms_user');
    await postgresClient.query('GRANT ALL PRIVILEGES ON DATABASE hrms_shadow TO hrms_app');
  } finally {
    postgresClient.release();
    await postgresPool.end();
  }

  await setupDatabase('hrms_dev');
  await setupDatabase('hrms_shadow');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
