import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "@/features/customers/schemas";
import { rupeesToPaisas } from "@/lib/format";
import {
  createTRPCRouter,
  adminProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import {
  createCustomer,
  getCustomer,
  getCustomerBills,
  getCustomerPayments,
  getCustomerReturnBills,
  getCustomerStats,
  getTopOutstandingCustomers,
  listCustomers,
  updateCustomer,
} from "@/server/db/repos/customers.repo";

const idInput = z.object({ id: z.number().int().positive() });
const customerIdInput = z.object({
  customerId: z.number().int().positive(),
});

/**
 * Customer API. Reads and creating a customer are open to any signed-in user
 * (`protectedProcedure`); updating credit terms is admin-only (`adminProcedure`).
 * Credit limits come in as rupees and are stored as `bigint` paisas via
 * `rupeesToPaisas`.
 */
export const customersRouter = createTRPCRouter({
  /** All customers, sorted by name. */
  list: protectedProcedure.query(() => listCustomers()),

  /** One customer by id; 404 if not found. */
  byId: protectedProcedure.input(idInput).query(async ({ input }) => {
    const customer = await getCustomer(input.id);
    if (!customer) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
    }
    return customer;
  }),

  /** Sale/return bills for a customer. */
  bills: protectedProcedure
    .input(customerIdInput)
    .query(({ input }) => getCustomerBills(input.customerId)),

  /** Return bills (credit notes) for a customer. */
  returnBills: protectedProcedure
    .input(customerIdInput)
    .query(({ input }) => getCustomerReturnBills(input.customerId)),

  /** Payments recorded against a customer. */
  payments: protectedProcedure
    .input(customerIdInput)
    .query(({ input }) => getCustomerPayments(input.customerId)),

  /** Dashboard aggregates: counts + total outstanding. */
  stats: protectedProcedure.query(() => getCustomerStats()),

  /** Highest-outstanding customers for the dashboard widget (default 5). */
  topOutstanding: protectedProcedure
    .input(
      z
        .object({ limit: z.number().int().positive().max(50).optional() })
        .optional(),
    )
    .query(({ input }) => getTopOutstandingCustomers(input?.limit ?? 5)),

  /** Create a customer (any signed-in user). Credit limit in rupees → paisas. */
  create: protectedProcedure
    .input(createCustomerSchema)
    .mutation(async ({ input }) => {
      const {
        name,
        area,
        phone,
        referral,
        creditLimitRupees,
        paymentType,
        initialOutstandingRupees,
      } = input;
      const customer = await createCustomer({
        name,
        area: area?.trim() ? area.trim() : null,
        phone: phone?.trim() ? phone.trim() : null,
        referral: referral?.trim() ? referral.trim() : null,
        creditLimitPaisas: rupeesToPaisas(creditLimitRupees),
        paymentType,
        outstandingPaisas: rupeesToPaisas(initialOutstandingRupees),
      });
      return { id: customer.id };
    }),

  /** Update a customer (admin only); 404 if not found. */
  update: adminProcedure
    .input(updateCustomerSchema)
    .mutation(async ({ input }) => {
      const {
        id,
        name,
        area,
        phone,
        referral,
        creditLimitRupees,
        paymentType,
      } = input;
      const updated = await updateCustomer(id, {
        name,
        area: area?.trim() ? area.trim() : null,
        phone: phone?.trim() ? phone.trim() : null,
        referral: referral?.trim() ? referral.trim() : null,
        creditLimitPaisas: rupeesToPaisas(creditLimitRupees),
        paymentType,
      });
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }
      return { id: updated.id };
    }),
});
