import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import ProductImage from "@/components/ProductImage";
import { button, panel, pageTitle } from "@/components/ui";
import { formatPesos } from "@/lib/money";
import { listAllProducts } from "@/lib/store/products";

export const metadata: Metadata = { title: "Productos" };

export default function AdminProductsPage() {
  return (
    <main>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageTitle}>Productos</h1>
        <Link href="/admin/productos/nuevo" className={button}>Nuevo producto</Link>
      </div>
      <Suspense fallback={<p className="mt-6 text-muted">Cargando…</p>}>
        <ProductsTable />
      </Suspense>
    </main>
  );
}

async function ProductsTable() {
  // Datos de MongoDB en cada petición, nunca prerenderizados al compilar.
  await connection();
  const products = await listAllProducts();
  if (products.length === 0) {
    return <p className="mt-6 text-muted">Todavía no hay productos. Creá el primero o corré el seed.</p>;
  }
  return (
    <div className={`${panel} mt-6 overflow-x-auto`}>
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="border-b border-line text-muted">
          <tr>
            <th className="p-3 font-semibold">Producto</th>
            <th className="p-3 font-semibold">Categoría</th>
            <th className="p-3 text-right font-semibold">Precio</th>
            <th className="p-3 text-right font-semibold">Stock</th>
            <th className="p-3 font-semibold">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {products.map((product) => (
            <tr key={product.id} className={product.active ? "" : "text-muted"}>
              <td className="p-3">
                <Link href={`/admin/productos/${product.id}`} className="flex items-center gap-3 font-semibold hover:underline">
                  <ProductImage src={product.imageUrl} name={product.name} className="w-10 shrink-0 rounded" />
                  {product.name}
                </Link>
              </td>
              <td className="p-3">{product.category}</td>
              <td className="tabular p-3 text-right">{formatPesos(product.price)}</td>
              <td className={`tabular p-3 text-right ${product.stock === 0 ? "font-semibold text-danger" : ""}`}>{product.stock}</td>
              <td className="p-3">{product.active ? "A la venta" : "Retirado"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
