import { ProductsGrid } from "@/features/products/components/products-grid";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";

export default async function ProductsPage() {
  const [products, session] = await Promise.all([api.products.list(), auth()]);
  const isAdmin = session?.user?.role === "admin";
  return (
    <ProductsGrid
      products={products}
      canCreate={isAdmin}
      canEdit={isAdmin}
      canManageCategories={isAdmin}
    />
  );
}
