const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function main() {
  const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  const res = await pool.query('SELECT COUNT(*) FROM "LoginAttempt" WHERE "createdAt" > NOW() - INTERVAL \'15 minutes\'');
  console.log("login attempts last 15min", res.rows[0].count);
  const user = await pool.query('SELECT "passwordHash", "isActive", "employeeId", "isSystemAdmin" FROM users WHERE email = $1', ['admin@example.com']);
  console.log("user", user.rows[0]);
  const tenant = await pool.query('SELECT "isActive" FROM tenants WHERE "externalId" = $1', ['default']);
  console.log("tenant", tenant.rows[0]);
  await pool.end();
}
main();
