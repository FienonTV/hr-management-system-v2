import bcrypt from "bcryptjs";
import { Pool } from "pg";

const email = process.argv[2];
const plainPassword = process.argv[3];

if (!email || !plainPassword) {
  console.error("Usage: npx tsx scripts/reset-password.ts <email> <new-password>");
  process.exit(1);
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is not set");
}

async function main() {
  const hash = await bcrypt.hash(plainPassword, 10);
  const pool = new Pool({ connectionString });
  const result = await pool.query("UPDATE users SET \"passwordHash\" = $1 WHERE email = $2", [hash, email]);
  console.log(`Updated ${result.rowCount} user(s)`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
