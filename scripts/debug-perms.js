const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const users = await pool.query("SELECT id, email, tenant_id, employee_id FROM users");
  console.log("Users:", users.rows);

  const simon = users.rows.find((u) => u.email === "simonwidansk@outlook.de");
  if (!simon) {
    console.log("Simon not found");
    await pool.end();
    return;
  }

  console.log("Simon:", simon);

  const rolePerms = await pool.query(
    `SELECT p.key
     FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = $1`,
    [simon.id]
  );
  console.log("Role permissions:", rolePerms.rows.map((r) => r.key));

  const userPerms = await pool.query(
    `SELECT p.key, up.granted
     FROM permissions p
     JOIN user_permissions up ON up.permission_id = p.id
     WHERE up.user_id = $1`,
    [simon.id]
  );
  console.log("User permissions:", userPerms.rows);

  const admin = await pool.query(
    `SELECT r.id, r.name, r."isAdmin"
     FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1 AND r."isAdmin" = true`,
    [simon.id]
  );
  console.log("Admin roles:", admin.rows);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
