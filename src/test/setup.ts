import "@testing-library/jest-dom/vitest";

// Fallback env so tests that import the server graph (env → db/auth) can load.
// Real values from the shell or .env take precedence. No DB connection is made
// unless a query actually runs.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.AUTH_SECRET ??= "test-auth-secret-0123456789abcdef";
