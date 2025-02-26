import "server-only";
import { createCaller } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

/**
 * In-process tRPC caller for React Server Components. Calls resolve directly
 * (no HTTP, no JSON), so `bigint`/`Date` values survive intact.
 */
export const api = createCaller(createTRPCContext);
