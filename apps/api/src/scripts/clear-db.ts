/**
 * Clears all demo data from the database.
 * Preserves only the admin@aqyl.kz account.
 *
 * Usage (from apps/api):
 *   npm run clear:db
 *   # or override the connection:
 *   DATABASE_URL="postgres://..." npm run clear:db
 */

import { DataSource } from "typeorm";
import * as path from "path";
import * as fs from "fs";

// Load .env / .env.local from apps/api directory
function loadEnv() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require("dotenv") as typeof import("dotenv");
  const base = path.join(__dirname, "../../");
  for (const file of [".env.local", ".env"]) {
    const p = path.join(base, file);
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      console.log(`Loaded ${file}`);
      break;
    }
  }
}

loadEnv();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("❌  DATABASE_URL is not set. Provide it via .env or as an environment variable.");
  process.exit(1);
}

const ds = new DataSource({
  type: "postgres",
  url: DB_URL,
  entities: [],      // raw queries only — no entities needed
  synchronize: false,
  logging: false,
});

async function run() {
  await ds.initialize();
  console.log("✅  Connected to database\n");

  // Count before
  const before = await counts();
  console.log("Before:");
  printCounts(before);

  // TRUNCATE all non-teacher tables.
  // CASCADE lets PostgreSQL handle any FK deps automatically.
  const tables = [
    "gifted_achievements",
    "gifted_teacher_assignments",
    "gifted_materials",
    "gifted_students",
    "gifted_plans",
    "student_transfers",
    "task_submission",
    "submission",
    "class_hour",
    "protocol",
    "open_lesson",
    "assignment",
    "schedule",
    "student",
    "classroom",
    "generated_document",
    "uploaded_file",
  ];

  await ds.query(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} CASCADE`);
  console.log("\nTruncated all data tables.");

  // Delete all teachers except the admin bootstrap account
  const { affected } = await ds.query(
    `DELETE FROM "teacher" WHERE email != 'admin@aqyl.kz'`,
  );
  const deletedTeachers = typeof affected === "number" ? affected : "?";
  console.log(`Deleted ${deletedTeachers} non-admin user(s).`);

  // Count after
  const after = await counts();
  console.log("\nAfter:");
  printCounts(after);

  // Confirm admin still exists
  const [admin] = await ds.query<{ email: string; role: string }[]>(
    `SELECT email, role FROM "teacher" WHERE email = 'admin@aqyl.kz'`,
  );
  if (admin) {
    console.log(`\n✅  Admin account preserved: ${admin.email} (${admin.role})`);
  } else {
    console.warn("\n⚠️   admin@aqyl.kz was NOT found — run the API once to re-create it.");
  }

  await ds.destroy();
  console.log("\nDone.");
}

async function counts() {
  const [t] = await ds.query<[{ c: string }]>(`SELECT COUNT(*) AS c FROM "teacher"`);
  const [s] = await ds.query<[{ c: string }]>(`SELECT COUNT(*) AS c FROM "student"`);
  const [c] = await ds.query<[{ c: string }]>(`SELECT COUNT(*) AS c FROM "classroom"`);
  return {
    teachers: Number(t.c),
    students: Number(s.c),
    classrooms: Number(c.c),
  };
}

function printCounts(c: ReturnType<typeof counts> extends Promise<infer R> ? R : never) {
  console.log(`  teachers: ${c.teachers}, students: ${c.students}, classrooms: ${c.classrooms}`);
}

run().catch((err) => {
  console.error("❌  Error:", err);
  process.exit(1);
});
