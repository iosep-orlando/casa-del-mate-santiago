import type { OrderStatus } from "./types";

// ---------------------------------------------------------------------------
// Estados de un pedido y qué cambios puede hacer el admin.
//
//   pending ──(pago confirmado por Stripe)──► paid ──► shipped
//      │                                       │
//      └──► cancelled ◄────(con reembolso)─────┘
//
// "paid" solo lo pone la confirmación del pago, nunca el admin a mano: si no,
// un pedido podría figurar como pagado sin que Stripe haya cobrado nada.
// ---------------------------------------------------------------------------

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Esperando el pago",
  paid: "Pagado",
  shipped: "Enviado",
  cancelled: "Cancelado",
};

const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: [],
  cancelled: [],
};

export function allowedAdminTransitions(from: OrderStatus): OrderStatus[] {
  return ADMIN_TRANSITIONS[from];
}

export function canAdminTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ADMIN_TRANSITIONS[from].includes(to);
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return value === "pending" || value === "paid" || value === "shipped" || value === "cancelled";
}

/**
 * Cuánto dura un pago abierto en Stripe. Pasado ese tiempo Stripe vence la
 * sesión (mínimo permitido: 30 minutos) y el pedido pendiente se cancela,
 * con webhook o sin él: ver STALE_PENDING_MS.
 */
export const CHECKOUT_TTL_SECONDS = 30 * 60;

/**
 * Un pedido pendiente más viejo que esto ya no se puede pagar: su sesión de
 * Stripe venció. Un minuto de margen sobre la caducidad de la sesión.
 */
export const STALE_PENDING_MS = (CHECKOUT_TTL_SECONDS + 60) * 1000;
