import Stripe from "stripe";
import { CHECKOUT_TTL_SECONDS } from "./orders";

// ---------------------------------------------------------------------------
// Stripe: el cliente de la API y cómo se arma una sesión de Checkout.
// ---------------------------------------------------------------------------

let client: Stripe | undefined;

/**
 * Se crea al primer uso y no al importar el módulo: así `next build` funciona
 * sin STRIPE_SECRET_KEY (no la necesita para compilar).
 */
export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('Falta la variable de entorno "STRIPE_SECRET_KEY"');
    client = new Stripe(key);
  }
  return client;
}

export interface CheckoutItem {
  name: string;
  price: number; // centavos
  quantity: number;
  imageUrl: string | null;
}

/**
 * Las líneas para Stripe. El precio sale de nuestra base, nunca del
 * navegador: si saliera del navegador, cualquiera podría pagar $ 1 por todo.
 * Stripe trabaja en la unidad menor de la moneda: para ARS, centavos, igual
 * que nosotros.
 */
export function checkoutLineItems(
  items: CheckoutItem[],
  origin: string,
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return items.map((item) => {
    const image = absoluteImage(item.imageUrl, origin);
    return {
      quantity: item.quantity,
      price_data: {
        currency: "ars",
        unit_amount: item.price,
        product_data: { name: item.name, ...(image ? { images: [image] } : {}) },
      },
    };
  });
}

/**
 * Stripe solo muestra imágenes con URL pública https. Las de la tienda
 * (/productos/…) se completan con el dominio; en localhost no hay imagen
 * (Stripe no puede descargarla).
 */
export function absoluteImage(imageUrl: string | null, origin: string): string | null {
  if (!imageUrl) return null;
  const url = imageUrl.startsWith("/") ? `${origin}${imageUrl}` : imageUrl;
  return url.startsWith("https://") ? url : null;
}

export interface CheckoutSessionInput {
  orderId: string;
  customerEmail: string;
  items: CheckoutItem[];
  origin: string;
  now: Date;
}

export function checkoutSessionParams(input: CheckoutSessionInput): Stripe.Checkout.SessionCreateParams {
  const { orderId, origin } = input;
  return {
    mode: "payment",
    line_items: checkoutLineItems(input.items, origin),
    customer_email: input.customerEmail,
    // Para encontrar el pedido desde la sesión, venga del webhook o de la
    // página de éxito.
    client_reference_id: orderId,
    metadata: { orderId },
    locale: "es-419",
    // {CHECKOUT_SESSION_ID} lo reemplaza Stripe al volver.
    success_url: `${origin}/checkout/exito?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancelado?pedido=${orderId}`,
    // Media hora para pagar (el mínimo de Stripe); luego vence y el pedido
    // pendiente se cancela.
    expires_at: Math.floor(input.now.getTime() / 1000) + CHECKOUT_TTL_SECONDS,
  };
}

/** El id del PaymentIntent de una sesión (viene como texto u objeto expandido). */
export function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
}
