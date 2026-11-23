// ---------------------------------------------------------------------------
// Confirmar un pago: lo que pasa cuando Stripe dice que un pedido se cobró.
//
// Llegan por dos caminos: el webhook (Stripe llama al servidor) y la página
// de éxito (el navegador vuelve de Stripe y pregunta). En producción llegan
// los dos, a veces a la vez; en local, sin `stripe listen`, solo el segundo.
// Por eso la confirmación es idempotente: la primera que "reclama" el pedido
// hace el trabajo y las demás no tocan nada.
//
// La lógica está separada de MongoDB y de Stripe (llegan como `deps`) para
// poder probar cada camino, incluidos los raros, sin servicios en marcha.
// ---------------------------------------------------------------------------

export interface StockLine {
  productId: string;
  quantity: number;
}

export interface ClaimedOrder {
  id: string;
  customerId: string;
  items: StockLine[];
}

export interface PaymentDeps {
  /**
   * Marca el pedido como reclamado por este pago si seguía pendiente y sin
   * reclamar. Devuelve el pedido, o null si ya lo había reclamado otro.
   */
  claim(sessionId: string, paymentIntentId: string): Promise<ClaimedOrder | null>;
  /** Descuenta stock solo si alcanza; false si no había suficiente. */
  takeOne(line: StockLine): Promise<boolean>;
  /** Devuelve unidades al stock. */
  giveBack(line: StockLine): Promise<void>;
  markPaid(orderId: string): Promise<void>;
  clearCart(customerId: string): Promise<void>;
  /** Devuelve el dinero; el id del reembolso, o null si Stripe falló. */
  refund(paymentIntentId: string): Promise<string | null>;
  markCancelled(orderId: string, reason: string, refundId: string | null): Promise<void>;
}

export type ConfirmResult = "paid" | "out-of-stock" | "already-handled";

export const OUT_OF_STOCK_REASON = "Se agotó un producto mientras pagabas.";
export const REFUND_PENDING = "El reembolso no se pudo hacer solo: la tienda lo hará a mano.";

/**
 * Descuenta el stock de todas las líneas, o de ninguna: si una falla, se
 * devuelve lo ya descontado. Cada descuento es atómico en MongoDB (solo baja
 * si stock >= cantidad), así que dos compras a la vez no dejan stock negativo.
 */
export async function takeStock(
  deps: Pick<PaymentDeps, "takeOne" | "giveBack">,
  lines: StockLine[],
): Promise<boolean> {
  const taken: StockLine[] = [];
  for (const line of lines) {
    if (await deps.takeOne(line)) {
      taken.push(line);
    } else {
      for (const done of taken) await deps.giveBack(done);
      return false;
    }
  }
  return true;
}

export async function confirmPayment(
  deps: PaymentDeps,
  sessionId: string,
  paymentIntentId: string,
): Promise<ConfirmResult> {
  const order = await deps.claim(sessionId, paymentIntentId);
  if (!order) return "already-handled";

  if (await takeStock(deps, order.items)) {
    await deps.markPaid(order.id);
    await deps.clearCart(order.customerId);
    return "paid";
  }

  // Se cobró, pero entre que el cliente abrió Stripe y pagó, otro se llevó
  // las últimas unidades. No se puede entregar: se devuelve el dinero.
  const refundId = await deps.refund(paymentIntentId);
  await deps.markCancelled(
    order.id,
    refundId ? OUT_OF_STOCK_REASON : `${OUT_OF_STOCK_REASON} ${REFUND_PENDING}`,
    refundId,
  );
  return "out-of-stock";
}
