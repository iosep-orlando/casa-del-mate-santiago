"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { orderNumber } from "@/lib/format";
import { formatPesos } from "@/lib/money";
import type { OrderDTO } from "@/lib/types";
import OrderSummary from "./OrderSummary";
import { button, buttonSecondary } from "./ui";

type State =
  | { kind: "checking" }
  | { kind: "done"; order: OrderDTO }
  | { kind: "slow"; order: OrderDTO | null }
  | { kind: "error"; message: string };

// Stripe vuelve aquí al pagar. El pago lo confirma el webhook o, si todavía
// no llegó, /api/checkout/verify preguntándole a Stripe. Se pregunta unas
// veces por si la tarjeta tarda en confirmarse.
const ATTEMPTS = 8;
const INTERVAL_MS = 1500;

export default function CheckoutResult() {
  const sessionId = useSearchParams().get("session_id");
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "checking" });

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check(attempt: number) {
      try {
        const res = await fetch(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId!)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setState({ kind: "error", message: data.error ?? "No pudimos comprobar el pago." });
          return;
        }
        const order: OrderDTO = data.order;
        if (order.status !== "pending") {
          setState({ kind: "done", order });
          router.refresh(); // el carrito vacío en la cabecera
        } else if (attempt + 1 < ATTEMPTS) {
          timer = setTimeout(() => check(attempt + 1), INTERVAL_MS);
        } else {
          setState({ kind: "slow", order });
        }
      } catch {
        if (!cancelled) setState({ kind: "error", message: "No se pudo contactar con el servidor." });
      }
    }

    check(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId, router]);

  if (!sessionId) return <Message title="Falta el pago" text="Esta página se abre al volver de Stripe." />;
  if (state.kind === "checking") {
    return <Message title="Comprobando el pago…" text="Un momento: le estamos preguntando a Stripe." />;
  }
  if (state.kind === "error") return <Message title="No pudimos comprobarlo" text={state.message} />;
  if (state.kind === "slow") {
    return (
      <Message
        title="Stripe todavía no lo confirmó"
        text="A veces tarda un poco. El pedido se actualiza solo: miralo en un rato en tus pedidos."
      />
    );
  }

  const { order } = state;
  const paid = order.status === "paid" || order.status === "shipped";
  return (
    <div className="max-w-2xl">
      <h1 className="display text-3xl">{paid ? "¡Listo, gracias por tu compra!" : "No pudimos completar el pedido"}</h1>
      <p className="mt-3 text-muted">
        {paid
          ? `Pagaste ${formatPesos(order.total)}. Tu pedido ${orderNumber(order.id)} ya está en preparación.`
          : order.cancelReason ?? "El pedido se canceló."}
      </p>
      <div className="mt-6">
        <OrderSummary order={order} />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/pedidos" className={button}>Ver mis pedidos</Link>
        <Link href="/" className={buttonSecondary}>Seguir comprando</Link>
      </div>
    </div>
  );
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="max-w-xl" role="status">
      <h1 className="display text-3xl">{title}</h1>
      <p className="mt-3 text-muted">{text}</p>
      <Link href="/pedidos" className={`${buttonSecondary} mt-6`}>Ver mis pedidos</Link>
    </div>
  );
}
