import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AddToCart from "@/components/AddToCart";
import ProductImage from "@/components/ProductImage";
import StockNote from "@/components/StockNote";
import { pageShell } from "@/components/ui";
import { formatPesos } from "@/lib/money";
import { getSession } from "@/lib/session";
import { getProduct } from "@/lib/store/products";

export default function ProductPage({ params }: PageProps<"/productos/[id]">) {
  return (
    <main className={pageShell}>
      <Link href="/" className="text-sm font-semibold text-muted hover:text-ink">← Catálogo</Link>
      <Suspense fallback={<p className="mt-6 text-muted">Cargando…</p>}>
        <ProductView params={params} />
      </Suspense>
    </main>
  );
}

async function ProductView({ params }: Pick<PageProps<"/productos/[id]">, "params">) {
  const { id } = await params;
  const [product, session] = await Promise.all([getProduct(id, true), getSession()]);
  if (!product) notFound();

  return (
    <article className="mt-6 grid gap-8 md:grid-cols-2">
      <ProductImage src={product.imageUrl} name={product.name} className="rounded-lg" />
      <div>
        <Link href={`/?categoria=${encodeURIComponent(product.category)}`} className="text-sm font-semibold text-hoja hover:underline">
          {product.category}
        </Link>
        <h1 className="display mt-1 text-3xl leading-tight sm:text-4xl">{product.name}</h1>
        <p className="tabular mt-4 text-3xl font-bold">{formatPesos(product.price)}</p>
        <div className="mt-1 min-h-6">
          <StockNote stock={product.stock} />
        </div>
        {product.description && (
          <p className="mt-6 whitespace-pre-line leading-relaxed text-ink/90">{product.description}</p>
        )}
        <div className="mt-8">
          {session?.role === "admin" ? (
            <p className="text-muted">
              Estás como admin.{" "}
              <Link href={`/admin/productos/${product.id}`} className="font-semibold text-yerba hover:underline">
                Editar este producto
              </Link>
            </p>
          ) : (
            <AddToCart productId={product.id} stock={product.stock} loggedIn={Boolean(session)} />
          )}
        </div>
      </div>
    </article>
  );
}
