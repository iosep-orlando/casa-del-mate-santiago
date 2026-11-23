import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ProductForm from "@/components/ProductForm";
import { pageTitle } from "@/components/ui";
import { getProduct, listAllCategories } from "@/lib/store/products";

export const metadata: Metadata = { title: "Editar producto" };

export default function EditProductPage({ params }: PageProps<"/admin/productos/[id]">) {
  return (
    <main>
      <Link href="/admin/productos" className="text-sm font-semibold text-muted hover:text-ink">← Productos</Link>
      <Suspense fallback={<p className="mt-6 text-muted">Cargando…</p>}>
        <EditForm params={params} />
      </Suspense>
    </main>
  );
}

async function EditForm({ params }: Pick<PageProps<"/admin/productos/[id]">, "params">) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProduct(id), listAllCategories()]);
  if (!product) notFound();
  return (
    <>
      <h1 className={`${pageTitle} mt-2`}>{product.name}</h1>
      {/* key: con otro producto, o con este mismo ya guardado con otros datos,
          el formulario arranca de cero con los valores actuales. */}
      <ProductForm key={JSON.stringify(product)} product={product} categories={categories} />
    </>
  );
}
