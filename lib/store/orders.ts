import type { ObjectId } from "mongodb";
import { collections, orderToDTO, toObjectId, type OrderDoc } from "../db";
import { STALE_PENDING_MS, canAdminTransition } from "../orders";
import { confirmPayment, type ConfirmResult, type PaymentDeps } from "../payments";
import { getStripe } from "../stripe";
import type { CartDTO, OrderDTO, OrderStatus } from "../types";
import type { Caller } from "../api";

// ---------------------------------------------------------------------------
// Pedidos en MongoDB: crearlos al ir a pagar, confirmarlos cuando Stripe
// cobra, y los cambios de estado del admin.
// ---------------------------------------------------------------------------

/** Crea el pedido "pending" con una copia de las líneas del carrito. */
export async function createPendingOrder(caller: Caller, cart: CartDTO): Promise<string> {
  const { orders } = await collections();
  const now = new Date();
  const doc: OrderDoc = {
    customerId: caller.userId,
    customerEmail: caller.email,
    customerName: caller.name,
    items: cart.lines.flatMap((line) => {
      const productId = toObjectId(line.productId);
      return productId ? [{ productId, name: line.name, price: line.price, quantity: line.quantity }] : [];
    }),
    total: cart.total,
    status: "pending",
    stripeSessionId: null,
    paymentIntentId: null,
    stockApplied: false,
    refundId: null,
    cancelReason: null,
    createdAt: now,
    paidAt: null,
    updatedAt: now,
  };
  const { insertedId } = await orders.insertOne(doc);
  return insertedId.toString();
}

export async function attachStripeSession(orderId: string, sessionId: string): Promise<void> {
  const _id = toObjectId(orderId);
  if (!_id) return;
  const { orders } = await collections();
  await orders.updateOne({ _id }, { $set: { stripeSessionId: sessionId, updatedAt: new Date() } });
}

/** Si Stripe no pudo crear la sesión, el pedido no llegó a existir para nadie. */
export async function discardOrder(orderId: string): Promise<void> {
  const _id = toObjectId(orderId);
  if (!_id) return;
  const { orders } = await collections();
  await orders.deleteOne({ _id, status: "pending", stripeSessionId: null });
}

export const EXPIRED_REASON = "El pago no se completó a tiempo.";

/**
 * Cancela los pendientes cuya sesión de Stripe ya venció. Normalmente lo
 * hace el webhook `checkout.session.expired`; esto cubre el caso en que el
 * webhook no llega (en local, sin `stripe listen`). Se llama al listar.
 */
export async function expireStalePending(now = new Date()): Promise<void> {
  const { orders } = await collections();
  await orders.updateMany(
    {
      status: "pending",
      paymentIntentId: null,
      createdAt: { $lt: new Date(now.getTime() - STALE_PENDING_MS) },
    },
    { $set: { status: "cancelled", cancelReason: EXPIRED_REASON, updatedAt: now } },
  );
}

/** Webhook checkout.session.expired: el cliente no pagó a tiempo. */
export async function cancelExpiredSession(sessionId: string): Promise<void> {
  const { orders } = await collections();
  await orders.updateOne(
    { stripeSessionId: sessionId, status: "pending", paymentIntentId: null },
    { $set: { status: "cancelled", cancelReason: EXPIRED_REASON, updatedAt: new Date() } },
  );
}

export async function listCustomerOrders(customerId: ObjectId): Promise<OrderDTO[]> {
  await expireStalePending();
  const { orders } = await collections();
  const docs = await orders.find({ customerId }).sort({ createdAt: -1 }).limit(100).toArray();
  return docs.map(orderToDTO);
}

export async function findOrderBySession(sessionId: string): Promise<OrderDTO | null> {
  const { orders } = await collections();
  const doc = await orders.findOne({ stripeSessionId: sessionId });
  return doc ? orderToDTO(doc) : null;
}

export async function listOrders(status?: OrderStatus): Promise<OrderDTO[]> {
  await expireStalePending();
  const { orders } = await collections();
  const docs = await orders
    .find(status ? { status } : {})
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  return docs.map(orderToDTO);
}

// ---------------------------------------------------------------------------
// Confirmación del pago (ver lib/payments.ts): las piezas de MongoDB y Stripe.
// ---------------------------------------------------------------------------

async function paymentDeps(): Promise<PaymentDeps> {
  const { orders, products, carts } = await collections();
  return {
    async claim(sessionId, paymentIntentId) {
      // Atómico: si el webhook y la página de éxito llegan a la vez, solo
      // uno encuentra paymentIntentId en null y se queda con el pedido.
      const doc = await orders.findOneAndUpdate(
        { stripeSessionId: sessionId, status: "pending", paymentIntentId: null },
        { $set: { paymentIntentId, updatedAt: new Date() } },
        { returnDocument: "after" },
      );
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        customerId: doc.customerId.toString(),
        items: doc.items.map((item) => ({ productId: item.productId.toString(), quantity: item.quantity })),
      };
    },
    async takeOne({ productId, quantity }) {
      const _id = toObjectId(productId);
      if (!_id) return false;
      // Solo baja si alcanza: dos compras a la vez no dejan el stock en negativo.
      const { modifiedCount } = await products.updateOne(
        { _id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
      );
      return modifiedCount === 1;
    },
    async giveBack({ productId, quantity }) {
      const _id = toObjectId(productId);
      if (_id) await products.updateOne({ _id }, { $inc: { stock: quantity } });
    },
    async markPaid(orderId) {
      const _id = toObjectId(orderId);
      if (!_id) return;
      const now = new Date();
      await orders.updateOne(
        { _id },
        { $set: { status: "paid", stockApplied: true, paidAt: now, updatedAt: now } },
      );
    },
    async clearCart(customerId) {
      const _id = toObjectId(customerId);
      if (_id) await carts.updateOne({ customerId: _id }, { $set: { items: [], updatedAt: new Date() } });
    },
    async refund(paymentIntentId) {
      try {
        const refund = await getStripe().refunds.create({ payment_intent: paymentIntentId });
        return refund.id;
      } catch (error) {
        console.error("No se pudo reembolsar", paymentIntentId, error);
        return null;
      }
    },
    async markCancelled(orderId, reason, refundId) {
      const _id = toObjectId(orderId);
      if (!_id) return;
      await orders.updateOne(
        { _id },
        { $set: { status: "cancelled", cancelReason: reason, refundId, updatedAt: new Date() } },
      );
    },
  };
}

export async function confirmCheckoutPayment(
  sessionId: string,
  paymentIntentId: string,
): Promise<ConfirmResult> {
  return confirmPayment(await paymentDeps(), sessionId, paymentIntentId);
}

// ---------------------------------------------------------------------------
// Cambios de estado del admin.
// ---------------------------------------------------------------------------

export type AdminChange =
  | { ok: true; order: OrderDTO }
  | { ok: false; status: number; error: string };

export const CANCELLED_BY_STORE = "Cancelado por la tienda.";

export async function changeOrderStatus(orderId: string, to: OrderStatus): Promise<AdminChange> {
  const _id = toObjectId(orderId);
  if (!_id) return { ok: false, status: 404, error: "No existe ese pedido." };
  const { orders, products } = await collections();
  const order = await orders.findOne({ _id });
  if (!order) return { ok: false, status: 404, error: "No existe ese pedido." };
  if (!canAdminTransition(order.status, to)) {
    return { ok: false, status: 409, error: "Ese cambio de estado no está permitido para este pedido." };
  }

  const now = new Date();
  const result = async (): Promise<AdminChange> => {
    const updated = await orders.findOne({ _id });
    return updated
      ? { ok: true, order: orderToDTO(updated) }
      : { ok: false, status: 404, error: "No existe ese pedido." };
  };
  const changedMeanwhile: AdminChange = {
    ok: false,
    status: 409,
    error: "El pedido cambió mientras tanto. Recargá la página.",
  };

  if (order.status === "pending") {
    // Primero se cierra el pago en Stripe: si no, el cliente podría pagar
    // un pedido que ya figura como cancelado.
    if (order.stripeSessionId) {
      try {
        await getStripe().checkout.sessions.expire(order.stripeSessionId);
      } catch {
        // Si ya no se puede vencer, o el cliente justo pagó (y el pedido
        // pasará a pagado), o la sesión ya había vencido. La actualización
        // condicional de abajo decide.
      }
    }
    const { modifiedCount } = await orders.updateOne(
      { _id, status: "pending", paymentIntentId: null },
      { $set: { status: "cancelled", cancelReason: CANCELLED_BY_STORE, updatedAt: now } },
    );
    return modifiedCount === 1 ? result() : changedMeanwhile;
  }

  if (to === "shipped") {
    const { modifiedCount } = await orders.updateOne(
      { _id, status: "paid" },
      { $set: { status: "shipped", updatedAt: now } },
    );
    return modifiedCount === 1 ? result() : changedMeanwhile;
  }

  // paid → cancelled: se marca primero (para que no se cancele dos veces),
  // luego se devuelve el dinero y por último el stock.
  const { modifiedCount } = await orders.updateOne(
    { _id, status: "paid" },
    { $set: { status: "cancelled", cancelReason: CANCELLED_BY_STORE, updatedAt: now } },
  );
  if (modifiedCount !== 1) return changedMeanwhile;

  let refundId: string;
  try {
    if (!order.paymentIntentId) throw new Error("Pedido pagado sin PaymentIntent");
    refundId = (await getStripe().refunds.create({ payment_intent: order.paymentIntentId })).id;
  } catch (error) {
    console.error("No se pudo reembolsar el pedido", orderId, error);
    await orders.updateOne(
      { _id, status: "cancelled" },
      { $set: { status: "paid", cancelReason: null, updatedAt: new Date() } },
    );
    return {
      ok: false,
      status: 502,
      error: "Stripe no pudo hacer el reembolso, así que el pedido sigue pagado. Probá de nuevo en un rato.",
    };
  }

  if (order.stockApplied) {
    for (const item of order.items) {
      await products.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } });
    }
  }
  await orders.updateOne({ _id }, { $set: { refundId, stockApplied: false, updatedAt: new Date() } });
  return result();
}
