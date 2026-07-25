import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';

async function main() {
  const directUrl = process.env.DIRECT_URL;
  const dbName = 'hrms_shadow';

  const pool = new Pool({ connectionString: directUrl });
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database ${dbName} created.`);
    } else {
      console.log(`Database ${dbName} already exists.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
