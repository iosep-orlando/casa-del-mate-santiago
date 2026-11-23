import { appOrigin, jsonError, requireCustomer } from "@/lib/api";
import { loadCart } from "@/lib/store/cart";
import { attachStripeSession, createPendingOrder, discardOrder } from "@/lib/store/orders";
import { checkoutSessionParams, getStripe } from "@/lib/stripe";

// Ir a pagar: se crea el pedido "pending" con una copia del carrito y una
// sesión de Stripe Checkout para él. El navegador va a la URL de Stripe.
// El stock no se toca todavía: se descuenta cuando el pago se confirma.
export async function POST(request: Request) {
  const caller = await requireCustomer();
  if (caller instanceof Response) return caller;

  const cart = await loadCart(caller.userId);
  if (cart.lines.length === 0) return jsonError(409, "Tu carrito está vacío.");
  if (!cart.canCheckout) {
    return jsonError(409, "Hay productos en el carrito que no se pueden comprar así. Revisalos antes de pagar.");
  }

  const orderId = await createPendingOrder(caller, cart);
  try {
    const session = await getStripe().checkout.sessions.create(
      checkoutSessionParams({
        orderId,
        customerEmail: caller.email,
        items: cart.lines,
        origin: appOrigin(request),
        now: new Date(),
      }),
      // Si la petición se reintenta, Stripe devuelve la misma sesión en vez
      // de crear otra para el mismo pedido.
      { idempotencyKey: `checkout-${orderId}` },
    );
    if (!session.url) throw new Error("Stripe no devolvió la URL de pago");
    await attachStripeSession(orderId, session.id);
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("No se pudo crear la sesión de Stripe", error);
    await discardOrder(orderId);
    return jsonError(502, "No se pudo abrir el pago con Stripe. Probá de nuevo en un rato.");
  }
}
