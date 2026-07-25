
import { Pool } from 'pg';
async function main() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:admin123@localhost:5432/postgres' });
  const result = await pool.query('SELECT current_user');
  console.log('OK:' + result.rows[0].current_user);
  await pool.end();
}
main().catch(e => { console.log('FAIL'); process.exit(1); });
