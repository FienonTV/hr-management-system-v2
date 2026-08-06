const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const hash = await bcrypt.hash("admin123", 12);
  await pool.query('UPDATE users SET "passwordHash" = $1 WHERE email = $2', [hash, "admin@example.com"]);
  console.log("password updated");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
