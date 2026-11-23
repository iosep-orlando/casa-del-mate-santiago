import type Stripe from "stripe";
import { jsonError } from "@/lib/api";
import { cancelExpiredSession, confirmCheckoutPayment } from "@/lib/store/orders";
import { getStripe, paymentIntentId } from "@/lib/stripe";

// Stripe avisa aquí de lo que pasa con los pagos. Cualquiera puede hacer un
// POST a esta URL, así que lo primero es comprobar la firma con
// STRIPE_WEBHOOK_SECRET: sin firma válida, nada se marca como pagado.
//
// La firma se calcula sobre el cuerpo exacto, byte a byte: por eso se lee
// como texto y no con request.json().
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return jsonError(500, 'Falta la variable de entorno "STRIPE_WEBHOOK_SECRET".');
  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonError(400, "Falta la firma de Stripe.");

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return jsonError(400, "Firma de Stripe inválida.");
  }

  switch (event.type) {
    // Pago con tarjeta: llega ya pagado. Con medios de pago diferidos
    // (transferencias, vales), payment_status es "unpaid" y el cobro llega
    // después en async_payment_succeeded.
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      const intent = paymentIntentId(session);
      if (session.payment_status === "paid" && intent) {
        await confirmCheckoutPayment(session.id, intent);
      }
      break;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      await cancelExpiredSession(event.data.object.id);
      break;
    default:
      // Otros eventos no interesan; 200 igual, para que Stripe no reintente.
      break;
  }
  return Response.json({ received: true });
}
