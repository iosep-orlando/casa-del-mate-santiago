"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { centsToInput, formatPesos, parsePesos } from "@/lib/money";
import type { ProductDTO } from "@/lib/types";
import { uploadedImageId } from "@/lib/images";
import { ImageProblem, shrinkImage } from "@/lib/shrink-image";
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
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Con Cache Components, Next.js esconde esta página al salir (por ejemplo,
  // al guardar y volver a la lista) en vez de desmontarla. Sin esto, al
  // volver a editar el mismo producto aparecía todavía "Guardando…", o lo
  // que se había escrito sin guardar. Al esconderse, vuelve a cero.
  useLayoutEffect(() => {
    const form = formRef.current;
    const initialPrice = product ? centsToInput(product.price) : "";
    const initialImage = product?.imageUrl ?? "";
    return () => {
      form?.reset();
      setPrice(initialPrice);
      setImageUrl(initialImage);
      setPending(false);
      setUploading(false);
      setConfirmDelete(false);
      setError(null);
      setImageError(null);
    };
  }, [product]);

  const cents = price ? parsePesos(price) : null;
  const image = normalizeImageUrl(imageUrl);
  const uploaded = uploadedImageId(imageUrl) !== null;

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setImageError(null);
    try {
      const blob = await shrinkImage(file);
      const res = await fetch("/api/admin/images", {
        method: "POST",
        headers: { "content-type": blob.type },
        body: blob,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImageError(data.error ?? "No se pudo subir la foto.");
        return;
      }
      setImageUrl(data.url);
    } catch (err) {
      setImageError(err instanceof ImageProblem ? err.message : "No se pudo subir la foto.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = ""; // para poder elegir la misma otra vez
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void uploadFile(event.dataTransfer.files[0]);
  }

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
    <form ref={formRef} onSubmit={handleSubmit} className={`${panel} mt-6 grid gap-6 p-5 lg:grid-cols-[1fr_14rem]`}>
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
          <p className={label}>Foto</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className={buttonSecondary}
            >
              {uploading ? "Subiendo la foto…" : imageUrl ? "Cambiar la foto" : "Subir una foto"}
            </button>
            {imageUrl && !uploading && (
              <button type="button" onClick={() => setImageUrl("")} className="text-sm font-semibold text-muted hover:text-danger">
                Quitar la foto
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            onChange={(event) => uploadFile(event.target.files?.[0])}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
          <p className="mt-1 text-xs text-muted">
            Desde tu computadora o celular (JPG, PNG o WebP). También podés arrastrarla sobre la vista previa. Se
            achica sola antes de subir.
          </p>
          <FormError message={imageError} />
          {uploaded ? (
            <input type="hidden" name="imageUrl" value={imageUrl} />
          ) : (
            <details className="mt-2" open={Boolean(imageUrl)}>
              <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-ink">
                O pegá la URL de una foto de internet
              </summary>
              <input
                id="imageUrl"
                name="imageUrl"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://…/foto.jpg"
                aria-label="URL de la foto"
                aria-describedby="image-help"
                className={`${input} mt-2`}
              />
              <p id="image-help" className={`mt-1 text-xs ${image.ok ? "text-muted" : "text-danger"}`}>
                {image.ok ? "Tiene que empezar con https://." : image.error}
              </p>
            </details>
          )}
        </div>
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="h-4 w-4 accent-yerba" />
          A la venta (si no, no aparece en el catálogo)
        </label>
        <FormError message={error} />
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={pending || uploading} className={button}>
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
      <div onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
        <p className={label}>Vista previa</p>
        <ProductImage
          src={image.ok ? image.value : null}
          name={product?.name ?? "?"}
          eager
          className={`rounded-md border border-line ${uploading ? "opacity-50" : ""}`}
        />
      </div>
    </form>
  );
}
