import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { PRODUCT_CATEGORIES } from "../../lib/constants";
import * as schema from "./schema";

const RS = (rupees: number) => BigInt(Math.round(rupees * 100));

const SEED_USERS = [
  {
    name: "Ahmed (Admin)",
    email: "admin@meguin.test",
    role: "admin",
    password: "admin123",
  },
  {
    name: "Salman (User)",
    email: "user@meguin.test",
    role: "user",
    password: "user123",
  },
];

const SEED_PRODUCTS = [
  {
    article: "MEG-20W50-208",
    name: "Meguin 20W50",
    unit: "Drum (208L)",
    price: 125000,
    category: "Engine Oil",
  },
  {
    article: "MEG-10W40-208",
    name: "Meguin 10W40",
    unit: "Drum (208L)",
    price: 118000,
    category: "Engine Oil",
  },
  {
    article: "MEG-5W30-208",
    name: "Meguin 5W30 Fully",
    unit: "Drum (208L)",
    price: 142000,
    category: "Engine Oil",
  },
  {
    article: "MEG-GO-80W90-208",
    name: "Meguin Gear Oil 80W90",
    unit: "Drum (208L)",
    price: 98000,
    category: "Gear Oil",
  },
  {
    article: "MEG-ATF-20",
    name: "Meguin ATF",
    unit: "Can (20L)",
    price: 14500,
    category: "Transmission",
  },
  {
    article: "MEG-GRS-18",
    name: "Meguin Grease",
    unit: "Tin (18kg)",
    price: 22000,
    category: "Grease",
  },
];

type SeedBillItem = { productIdx: number; qty: number };
type SeedBill = {
  billNo: string;
  date: string;
  amount: number;
  type: string;
  status: string;
  note: string;
  items: SeedBillItem[];
};
type SeedPayment = {
  payId: string;
  date: string;
  amount: number;
  method: string;
  note: string;
  approval: string;
  approvedBy: string | null;
  approvedAt: string | null;
};
type SeedCustomer = {
  name: string;
  area: string;
  phone: string;
  creditLimit: number;
  outstanding: number;
  lastPaymentDate: string | null;
  lastPaymentAmt: number | null;
  paymentType: string;
  bills: SeedBill[];
  payments: SeedPayment[];
};

const SEED_CUSTOMERS: SeedCustomer[] = [
  {
    name: "Makki Oil Store",
    area: "Saddar",
    phone: "0300-1234567",
    creditLimit: 500000,
    outstanding: 320000,
    lastPaymentDate: "2026-05-15",
    lastPaymentAmt: 80000,
    paymentType: "deferred",
    bills: [
      {
        billNo: "B-1041",
        date: "2026-05-10",
        amount: 120000,
        type: "deferred",
        status: "unpaid",
        note: "",
        items: [{ productIdx: 0, qty: 1 }],
      },
      {
        billNo: "B-1028",
        date: "2026-05-01",
        amount: 200000,
        type: "deferred",
        status: "unpaid",
        note: "",
        items: [],
      },
      {
        billNo: "B-1015",
        date: "2026-04-20",
        amount: 80000,
        type: "cash",
        status: "paid",
        note: "",
        items: [],
      },
    ],
    payments: [
      {
        payId: "P-101",
        date: "2026-05-15",
        amount: 80000,
        method: "cash",
        note: "Collected by Salman",
        approval: "approved",
        approvedBy: "Ahmed (Admin)",
        approvedAt: "2026-05-15",
      },
    ],
  },
  {
    name: "Al-Noor Lubricants",
    area: "Gulberg",
    phone: "0321-9876543",
    creditLimit: 300000,
    outstanding: 290000,
    lastPaymentDate: "2026-05-05",
    lastPaymentAmt: 50000,
    paymentType: "deferred",
    bills: [
      {
        billNo: "B-1039",
        date: "2026-05-08",
        amount: 150000,
        type: "deferred",
        status: "unpaid",
        note: "",
        items: [],
      },
      {
        billNo: "B-1022",
        date: "2026-04-25",
        amount: 140000,
        type: "deferred",
        status: "unpaid",
        note: "",
        items: [],
      },
    ],
    payments: [
      {
        payId: "P-100",
        date: "2026-05-05",
        amount: 50000,
        method: "bank",
        note: "",
        approval: "pending",
        approvedBy: null,
        approvedAt: null,
      },
    ],
  },
  {
    name: "Rehman Auto Parts",
    area: "Township",
    phone: "0333-4567890",
    creditLimit: 200000,
    outstanding: 0,
    lastPaymentDate: "2026-05-18",
    lastPaymentAmt: 95000,
    paymentType: "cash",
    bills: [
      {
        billNo: "B-1045",
        date: "2026-05-18",
        amount: 95000,
        type: "cash",
        status: "paid",
        note: "",
        items: [],
      },
      {
        billNo: "B-1033",
        date: "2026-05-10",
        amount: 60000,
        type: "cash",
        status: "paid",
        note: "",
        items: [],
      },
    ],
    payments: [],
  },
  {
    name: "City Motors",
    area: "DHA",
    phone: "0311-2233445",
    creditLimit: 800000,
    outstanding: 450000,
    lastPaymentDate: "2026-05-12",
    lastPaymentAmt: 200000,
    paymentType: "deferred",
    bills: [
      {
        billNo: "B-1044",
        date: "2026-05-17",
        amount: 250000,
        type: "deferred",
        status: "unpaid",
        note: "",
        items: [],
      },
      {
        billNo: "B-1036",
        date: "2026-05-07",
        amount: 200000,
        type: "deferred",
        status: "unpaid",
        note: "",
        items: [],
      },
    ],
    payments: [
      {
        payId: "P-099",
        date: "2026-05-12",
        amount: 200000,
        method: "cheque",
        note: "Cheque #4421",
        approval: "approved",
        approvedBy: "Ahmed (Admin)",
        approvedAt: "2026-05-13",
      },
    ],
  },
  {
    name: "Pak Petroleum",
    area: "Johar Town",
    phone: "0345-6789012",
    creditLimit: 150000,
    outstanding: 160000,
    lastPaymentDate: "2026-04-10",
    lastPaymentAmt: 30000,
    paymentType: "deferred",
    bills: [
      {
        billNo: "B-1040",
        date: "2026-05-09",
        amount: 80000,
        type: "deferred",
        status: "unpaid",
        note: "",
        items: [],
      },
      {
        billNo: "B-1027",
        date: "2026-04-28",
        amount: 80000,
        type: "deferred",
        status: "unpaid",
        note: "",
        items: [],
      },
    ],
    payments: [
      {
        payId: "P-098",
        date: "2026-04-10",
        amount: 30000,
        method: "cash",
        note: "",
        approval: "rejected",
        approvedBy: "Ahmed (Admin)",
        approvedAt: "2026-04-11",
      },
    ],
  },
  {
    name: "Hassan Traders",
    area: "Model Town",
    phone: "0300-9988776",
    creditLimit: 400000,
    outstanding: 120000,
    lastPaymentDate: "2026-05-16",
    lastPaymentAmt: 120000,
    paymentType: "mixed",
    bills: [
      {
        billNo: "B-1043",
        date: "2026-05-16",
        amount: 120000,
        type: "deferred",
        status: "unpaid",
        note: "",
        items: [],
      },
      {
        billNo: "B-1030",
        date: "2026-05-05",
        amount: 120000,
        type: "cash",
        status: "paid",
        note: "",
        items: [],
      },
    ],
    payments: [],
  },
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const client = postgres(process.env.DATABASE_URL, { prepare: false });
  const db = drizzle(client, { schema });

  console.log("→ Truncating tables…");
  await db.execute(
    sql`TRUNCATE TABLE stock_transfer_item, stock_transfer, bill_item, bill, payment, customer, product, category, "user", account, session, verification_token RESTART IDENTITY CASCADE`,
  );

  console.log("→ Seeding categories…");
  await db
    .insert(schema.categories)
    .values(PRODUCT_CATEGORIES.map((name) => ({ name })));

  console.log("→ Seeding users…");
  for (const u of SEED_USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await db.insert(schema.users).values({
      name: u.name,
      email: u.email,
      role: u.role,
      passwordHash: hash,
    });
  }

  console.log("→ Seeding products…");
  const insertedProducts = await db
    .insert(schema.products)
    .values(
      SEED_PRODUCTS.map((p) => ({
        articleNumber: p.article,
        name: p.name,
        unit: p.unit,
        category: p.category,
        pricePaisas: RS(p.price),
      })),
    )
    .returning({ articleNumber: schema.products.articleNumber });

  console.log("→ Seeding stock…");
  // Demo on-hand + reorder levels per SEED_PRODUCTS index (one low, one out).
  const SEED_STOCK = [50, 30, 8, 0, 25, 5];
  const SEED_REORDER = [10, 10, 10, 5, 8, 10];
  for (let i = 0; i < SEED_PRODUCTS.length; i++) {
    const articleNumber = insertedProducts[i].articleNumber;
    const qty = SEED_STOCK[i];
    // Seed stock lands entirely in the warehouse; office is stocked via transfers.
    await db.insert(schema.stock).values({
      articleNumber,
      warehouseQty: qty.toString(),
      reorderLevel: SEED_REORDER[i].toString(),
    });
    await db.insert(schema.stockMovements).values({
      articleNumber,
      kind: "opening",
      location: "warehouse",
      qtyDelta: qty.toString(),
      balanceAfter: qty.toString(),
      note: "Seed opening stock",
    });
  }

  console.log("→ Seeding customers + bills + payments…");
  for (const c of SEED_CUSTOMERS) {
    const [{ id: customerId }] = await db
      .insert(schema.customers)
      .values({
        name: c.name,
        area: c.area,
        phone: c.phone,
        creditLimitPaisas: RS(c.creditLimit),
        outstandingPaisas: RS(c.outstanding),
        paymentType: c.paymentType,
        lastPaymentDate: c.lastPaymentDate,
        lastPaymentPaisas:
          c.lastPaymentAmt !== null ? RS(c.lastPaymentAmt) : null,
      })
      .returning({ id: schema.customers.id });

    for (const b of c.bills) {
      const [{ id: billId }] = await db
        .insert(schema.bills)
        .values({
          billNo: b.billNo,
          customerId,
          date: b.date,
          type: b.type,
          status: b.status,
          note: b.note,
          amountPaisas: RS(b.amount),
        })
        .returning({ id: schema.bills.id });

      if (b.items.length > 0) {
        await db.insert(schema.billItems).values(
          b.items.map((it) => {
            const product = SEED_PRODUCTS[it.productIdx];
            const articleNumber = insertedProducts[it.productIdx].articleNumber;
            return {
              billId,
              articleNumber,
              nameSnapshot: product.name,
              unitSnapshot: product.unit,
              unitPricePaisas: RS(product.price),
              qty: it.qty.toString(),
            };
          }),
        );
      }
    }

    for (const p of c.payments) {
      await db.insert(schema.payments).values({
        payId: p.payId,
        customerId,
        date: p.date,
        amountPaisas: RS(p.amount),
        method: p.method,
        note: p.note,
        approval: p.approval,
        approvedBy: p.approvedBy,
        approvedAt: p.approvedAt ? new Date(p.approvedAt) : null,
      });
    }
  }

  await client.end();
  console.log("✓ Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
