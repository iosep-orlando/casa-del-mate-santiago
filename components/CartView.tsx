"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPesos } from "@/lib/money";
import type { CartDTO, CartLineDTO } from "@/lib/types";
import { MAX_QUANTITY } from "@/lib/validation";
import FormError from "./FormError";
import ProductImage from "./ProductImage";
import { button, input, panel } from "./ui";

export default function CartView({ initial }: { initial: CartDTO }) {
  const router = useRouter();
  const [cart, setCart] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null); // productId en curso, o "checkout"
  const [error, setError] = useState<string | null>(null);

  // Con Cache Components, Next.js esconde las páginas que dejás en vez de
  // desmontarlas, y al volver el estado sería el de antes (sin lo que
  // agregaste mientras tanto). Los efectos sí se vuelven a ejecutar al
  // mostrarse: se relee el carrito cada vez.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/cart")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CartDTO | null) => {
        if (data && !cancelled) setCart(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function send(method: "PATCH" | "DELETE", productId: string, quantity?: number) {
    setBusy(productId);
    setError(null);
    try {
      const res = await fetch("/api/cart", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar el carrito.");
        return;
      }
      setCart(data);
      router.refresh(); // el número de la cabecera
    } catch {
      setError("No se pudo contactar con el servidor.");
    } finally {
      setBusy(null);
    }
  }

  async function checkout() {
    setBusy("checkout");
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error ?? "No se pudo abrir el pago.");
        setBusy(null);
        return;
      }
      // A la página de pago de Stripe. Se queda en "Abriendo…" hasta que cargue.
      window.location.assign(data.url);
    } catch {
      setError("No se pudo contactar con el servidor.");
      setBusy(null);
    }
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-dashed border-line p-10 text-center">
        <p className="font-semibold">Tu carrito está vacío.</p>
        <Link href="/" className={`${button} mt-4`}>Ver el catálogo</Link>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <ul className={`${panel} divide-y divide-line`}>
        {cart.lines.map((line) => (
          <CartRow
            key={line.productId}
            line={line}
            disabled={busy !== null}
            onQuantity={(quantity) => send("PATCH", line.productId, quantity)}
            onRemove={() => send("DELETE", line.productId)}
          />
        ))}
      </ul>

      <aside className={`${panel} space-y-4 p-5 lg:sticky lg:top-4`}>
        <div className="flex items-baseline justify-between">
          <span className="font-semibold">Total</span>
          <span className="tabular text-2xl font-bold">{formatPesos(cart.total)}</span>
        </div>
        <FormError message={error} />
        {!cart.canCheckout && (
          <p className="text-sm text-danger">Hay productos que no se pueden comprar así. Arreglalos para poder pagar.</p>
        )}
        <button type="button" onClick={checkout} disabled={!cart.canCheckout || busy !== null} className={`${button} w-full`}>
          {busy === "checkout" ? "Abriendo el pago…" : "Pagar con Stripe"}
        </button>
        <p className="text-xs text-muted">
          Pago de prueba: usá la tarjeta 4000 0003 2000 0021, cualquier fecha futura y cualquier código, con
          facturación en Argentina.
        </p>
      </aside>
    </div>
  );
}

function CartRow({
  line,
  disabled,
  onQuantity,
  onRemove,
}: {
  line: CartLineDTO;
  disabled: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  // Se puede elegir hasta el stock, pero si ya pedía más, esa cantidad sigue
  // en la lista (marcada con el problema) hasta que la cambie.
  const max = Math.max(Math.min(line.stock, MAX_QUANTITY), 1);
  const options = Array.from({ length: max }, (_, i) => i + 1);
  if (line.quantity > max) options.push(line.quantity);

  return (
    <li className="flex gap-4 p-4">
      <Link href={`/productos/${line.productId}`} className="w-20 shrink-0 sm:w-24">
        <ProductImage src={line.imageUrl} name={line.name} className="rounded-md" />
      </Link>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Link href={`/productos/${line.productId}`} className="font-semibold hover:underline">{line.name}</Link>
          <span className="tabular font-bold">{formatPesos(line.subtotal)}</span>
        </div>
        <p className="tabular text-sm text-muted">{formatPesos(line.price)} c/u</p>
        {line.problem && <p className="text-sm font-semibold text-danger">{line.problem}</p>}
        <div className="mt-auto flex items-center gap-3">
          <label className="sr-only" htmlFor={`qty-${line.productId}`}>Cantidad de {line.name}</label>
          <div className="w-20">
          <select
            id={`qty-${line.productId}`}
            value={line.quantity}
            disabled={disabled || line.stock === 0}
            onChange={(event) => onQuantity(Number(event.target.value))}
            className={`${input} py-1`}
          >
            {options.map((n) => (
              <option key={n} value={n} disabled={n > line.stock}>{n}</option>
            ))}
          </select>
          </div>
          <button type="button" onClick={onRemove} disabled={disabled} className="text-sm font-semibold text-muted hover:text-danger disabled:opacity-60">
            Quitar
          </button>
        </div>
      </div>
    </li>
  );
}
