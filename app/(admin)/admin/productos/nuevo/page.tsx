import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import ProductForm from "@/components/ProductForm";
import { pageTitle } from "@/components/ui";
import { listAllCategories } from "@/lib/store/products";

export const metadata: Metadata = { title: "Nuevo producto" };

export default function NewProductPage() {
  return (
    <main>
      <Link href="/admin/productos" className="text-sm font-semibold text-muted hover:text-ink">← Productos</Link>
      <h1 className={`${pageTitle} mt-2`}>Nuevo producto</h1>
      <Suspense fallback={<p className="mt-6 text-muted">Cargando…</p>}>
        <NewProductForm />
      </Suspense>
    </main>
  );
}

async function NewProductForm() {
  // Datos de MongoDB en cada petición, nunca prerenderizados al compilar.
  await connection();
  return <ProductForm categories={await listAllCategories()} />;
}
