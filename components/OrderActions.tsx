"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderStatus } from "@/lib/types";
import FormError from "./FormError";
import { button, buttonDanger } from "./ui";

/** Los botones de cambio de estado de un pedido, según dónde está. */
export default function OrderActions({
  orderId,
  status,
  options,
}: {
  orderId: string;
  status: OrderStatus;
  options: OrderStatus[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) return null;

  async function change(to: OrderStatus) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: to }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo cambiar el estado.");
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("No se pudo contactar con el servidor.");
    } finally {
      setPending(false);
    }
  }

  const cancelText =
    status === "paid"
      ? "Se devuelve el dinero por Stripe y vuelve el stock."
      : "El cliente ya no va a poder pagarlo.";

  return (
    <div className="mt-4 space-y-2 border-t border-line pt-4">
      <div className="flex flex-wrap items-center gap-3">
        {options.includes("shipped") && (
          <button type="button" onClick={() => change("shipped")} disabled={pending} className={button}>
            Marcar como enviado
          </button>
        )}
        {options.includes("cancelled") &&
          (confirming ? (
            <>
              <button type="button" onClick={() => change("cancelled")} disabled={pending} className={buttonDanger}>
                {pending ? "Cancelando…" : status === "paid" ? "Sí, cancelar y reembolsar" : "Sí, cancelar"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="text-sm font-semibold text-muted">
                No
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} disabled={pending} className={buttonDanger}>
              {status === "paid" ? "Cancelar y reembolsar" : "Cancelar pedido"}
            </button>
          ))}
      </div>
      {confirming && <p className="text-sm text-muted">{cancelText}</p>}
      <FormError message={error} />
    </div>
  );
}
