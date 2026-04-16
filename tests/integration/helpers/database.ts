import { db } from "@/lib/db";

type PublicTableRow = {
  schemaname: string;
  tablename: string;
};

export async function resetDatabase() {
  const tables = await db.$queryRaw<PublicTableRow[]>`
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `;

  if (tables.length === 0) {
    return;
  }

  const identifiers = tables
    .map((table) => `"${table.schemaname}"."${table.tablename}"`)
    .join(", ");

  await db.$executeRawUnsafe(
    `TRUNCATE TABLE ${identifiers} RESTART IDENTITY CASCADE`,
  );
}
