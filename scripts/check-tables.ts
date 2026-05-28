import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  const counts = await sql`
    SELECT 'user' AS t, COUNT(*) AS c FROM "user" UNION ALL
    SELECT 'product', COUNT(*) FROM product UNION ALL
    SELECT 'customer', COUNT(*) FROM customer UNION ALL
    SELECT 'bill', COUNT(*) FROM bill UNION ALL
    SELECT 'bill_item', COUNT(*) FROM bill_item UNION ALL
    SELECT 'payment', COUNT(*) FROM payment
    ORDER BY t
  `;
  console.table(counts.map((r) => ({ table: r.t, rows: Number(r.c) })));
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
