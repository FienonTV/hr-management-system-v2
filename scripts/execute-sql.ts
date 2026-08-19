import { Pool } from "pg";
import fs from "fs";
import path from "path";

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Usage: npx tsx scripts/execute-sql.ts <sql-file>");
  process.exit(1);
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });

async function main() {
  const sql = fs.readFileSync(path.resolve(sqlFile), "utf-8");
  const result = await pool.query(sql);
  if (result.rows.length > 0) {
    console.log(JSON.stringify(result.rows, null, 2));
  } else {
    console.log("SQL executed successfully");
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
