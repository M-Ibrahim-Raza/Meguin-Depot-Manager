/**
 * Stock repository — a barrel over three concern-split modules. Imports from
 * "@/server/db/repos/stock.repo" continue to resolve unchanged.
 *
 * - {@link file://./stock-ledger.repo.ts stock-ledger.repo}: the single seam that
 *   mutates on-hand (`applyStockMovementTx`) plus the bill deduct / return-restock
 *   helpers and the typed `InsufficientStockError`.
 * - {@link file://./stock-mutations.repo.ts stock-mutations.repo}: admin-only manual
 *   ops (opening / add / adjust / reorder level), each its own transaction.
 * - {@link file://./stock-reads.repo.ts stock-reads.repo}: read projections for the
 *   stock list, per-product history, and the global movement log.
 */
export * from "./stock-ledger.repo";
export * from "./stock-mutations.repo";
export * from "./stock-reads.repo";
