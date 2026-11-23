"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_QUANTITY } from "@/lib/validation";
import FormError from "./FormError";
import { button, input } from "./ui";

export default function AddToCart({
  productId,
  stock,
  loggedIn,
}: {
  productId: string;
  stock: number;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  if (stock === 0) return <p className="font-semibold text-danger">Sin stock por ahora.</p>;

  if (!loggedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(`/productos/${productId}`)}`} className={button}>
        Ingresá para comprar
      </Link>
    );
  }

  const max = Math.min(stock, MAX_QUANTITY);

  async function add() {
    setPending(true);
    setError(null);
    setAdded(false);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo agregar. Probá de nuevo.");
        return;
      }
      setAdded(true);
      router.refresh(); // el número del carrito en la cabecera
    } catch {
      setError("No se pudo contactar con el servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="w-24">
          <label htmlFor="quantity" className="mb-1 block text-sm font-semibold">Cantidad</label>
          <select
            id="quantity"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className={input}
          >
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button type="button" onClick={add} disabled={pending} className={`${button} h-[42px]`}>
          {pending ? "Agregando…" : "Agregar al carrito"}
        </button>
      </div>
      <FormError message={error} />
      {added && (
        <p role="status" className="text-sm">
          Agregado al carrito.{" "}
          <Link href="/carrito" className="font-semibold text-yerba hover:underline">Ver el carrito</Link>
        </p>
      )}
    </div>
  );
}
