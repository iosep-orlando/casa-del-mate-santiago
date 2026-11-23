"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { centsToInput, formatPesos, parsePesos } from "@/lib/money";
import type { ProductDTO } from "@/lib/types";
import { normalizeImageUrl } from "@/lib/validation";
import FormError from "./FormError";
import ProductImage from "./ProductImage";
import { button, buttonDanger, buttonSecondary, input, label, panel } from "./ui";

export default function ProductForm({ product, categories }: { product?: ProductDTO; categories: string[] }) {
  const router = useRouter();
  const editing = Boolean(product);
  const [price, setPrice] = useState(product ? centsToInput(product.price) : "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cents = price ? parsePesos(price) : null;
  const image = normalizeImageUrl(imageUrl);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const body = { ...Object.fromEntries(form), active: form.get("active") === "on" };
    try {
      const res = await fetch(editing ? `/api/admin/products/${product!.id}` : "/api/admin/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar.");
        setPending(false);
        return;
      }
      router.push("/admin/productos");
      router.refresh();
    } catch {
      setError("No se pudo contactar con el servidor.");
      setPending(false);
    }
  }

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${product!.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo borrar.");
        setPending(false);
        return;
      }
      router.push("/admin/productos");
      router.refresh();
    } catch {
      setError("No se pudo contactar con el servidor.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${panel} mt-6 grid gap-6 p-5 lg:grid-cols-[1fr_14rem]`}>
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className={label}>Nombre</label>
          <input id="name" name="name" required maxLength={120} defaultValue={product?.name} className={input} />
        </div>
        <div>
          <label htmlFor="description" className={label}>Descripción</label>
          <textarea id="description" name="description" rows={4} maxLength={2000} defaultValue={product?.description} className={input} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="price" className={label}>Precio ($)</label>
            <input
              id="price"
              name="price"
              required
              inputMode="decimal"
              placeholder="12.500"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              aria-describedby="price-help"
              className={`${input} tabular`}
            />
            <p id="price-help" className={`mt-1 text-xs ${price && cents === null ? "text-danger" : "text-muted"}`}>
              {!price ? "Con coma para los centavos." : cents === null ? "Ejemplos: 12500 o 12.500,50" : `Se cobra ${formatPesos(cents)}`}
            </p>
          </div>
          <div>
            <label htmlFor="stock" className={label}>Stock</label>
            <input id="stock" name="stock" type="number" required min={0} max={100000} step={1} defaultValue={product?.stock ?? 0} className={`${input} tabular`} />
          </div>
          <div>
            <label htmlFor="category" className={label}>Categoría</label>
            <input id="category" name="category" required maxLength={40} list="categories" defaultValue={product?.category} className={input} />
            <datalist id="categories">
              {categories.map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>
        </div>
        <div>
          <label htmlFor="imageUrl" className={label}>Foto (URL)</label>
          <input
            id="imageUrl"
            name="imageUrl"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://…/foto.jpg"
            aria-describedby="image-help"
            className={input}
          />
          <p id="image-help" className={`mt-1 text-xs ${image.ok ? "text-muted" : "text-danger"}`}>
            {image.ok ? "Opcional. Una URL https de la foto, o una ruta de la tienda como /productos/mate.svg." : image.error}
          </p>
        </div>
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="h-4 w-4 accent-yerba" />
          A la venta (si no, no aparece en el catálogo)
        </label>
        <FormError message={error} />
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={pending} className={button}>
            {pending ? "Guardando…" : editing ? "Guardar cambios" : "Crear producto"}
          </button>
          <Link href="/admin/productos" className={buttonSecondary}>Cancelar</Link>
          {editing &&
            (confirmDelete ? (
              <span className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={handleDelete} disabled={pending} className={buttonDanger}>
                  Sí, borrar
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-sm font-semibold text-muted">
                  No
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className={`${buttonDanger} sm:ml-auto`}>
                Borrar producto
              </button>
            ))}
        </div>
        {confirmDelete && (
          <p className="text-sm text-muted">
            Se borra del catálogo y de los carritos. Los pedidos ya hechos lo conservan. Para dejar de venderlo sin
            borrarlo, desmarcá «A la venta».
          </p>
        )}
      </div>
      <div>
        <p className={label}>Vista previa</p>
        <ProductImage src={image.ok ? image.value : null} name={product?.name ?? "?"} className="rounded-md border border-line" />
      </div>
    </form>
  );
}
