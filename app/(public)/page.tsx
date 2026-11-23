import Link from "next/link";
import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import { input, pageShell } from "@/components/ui";
import { readCatalogParams } from "@/lib/catalog";
import { catalogHref } from "@/lib/search";
import { listCatalog, listCategories } from "@/lib/store/products";

export default function CatalogPage({ searchParams }: PageProps<"/">) {
  return (
    <main className={pageShell}>
      <h1 className="display max-w-2xl text-4xl leading-tight sm:text-5xl">Todo para el mate, de la yerba al termo.</h1>
      {/* Los filtros dependen de la URL de cada visita: con Cache Components, en Suspense. */}
      <Suspense fallback={<p className="mt-10 text-muted">Cargando el catálogo…</p>}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Catalog({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { q, category } = readCatalogParams(await searchParams);
  const [products, categories] = await Promise.all([listCatalog({ q, category }), listCategories()]);
  const filtered = Boolean(q || category);

  return (
    <>
      <form action="/" className="mt-8 flex max-w-xl gap-2" role="search">
        {category && <input type="hidden" name="categoria" value={category} />}
        <label htmlFor="q" className="sr-only">Buscar productos</label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Buscar: yerba, bombilla, termo…" className={input} />
        <button type="submit" className="rounded-md bg-yerba px-4 font-semibold text-white hover:bg-yerba-dark">
          Buscar
        </button>
      </form>

      <nav aria-label="Categorías" className="mt-4 flex flex-wrap gap-2">
        <CategoryLink href={catalogHref({ q })} active={!category}>Todo</CategoryLink>
        {categories.map((name) => (
          <CategoryLink key={name} href={catalogHref({ q, categoria: name })} active={name === category}>
            {name}
          </CategoryLink>
        ))}
      </nav>

      {filtered && (
        <p className="mt-6 text-sm text-muted" aria-live="polite">
          {products.length === 1 ? "1 producto" : `${products.length} productos`}
          {q && <> para «{q}»</>}
          {category && <> en {category}</>}.{" "}
          <Link href="/" className="font-semibold text-yerba hover:underline">Ver todo</Link>
        </p>
      )}

      {products.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-line p-10 text-center">
          <p className="font-semibold">{filtered ? "No encontramos nada con esa búsqueda." : "Todavía no hay productos a la venta."}</p>
          {filtered && <p className="mt-1 text-muted">Probá con otra palabra o mirá todas las categorías.</p>}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}

function CategoryLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3 py-1 text-sm font-semibold ${
        active ? "border-yerba bg-yerba text-white" : "border-line bg-white hover:border-yerba"
      }`}
    >
      {children}
    </Link>
  );
}
