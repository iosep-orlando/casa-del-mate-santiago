import { jsonError, requireCustomer } from "@/lib/api";
import { confirmCheckoutPayment, findOrderBySession } from "@/lib/store/orders";
import { getStripe, paymentIntentId } from "@/lib/stripe";

// La página de éxito pregunta aquí cómo quedó el pago. Se consulta la sesión
// a Stripe (no se cree lo que diga la URL) y, si está pagada y el webhook
// todavía no llegó —en local sin `stripe listen` no llega nunca—, se
// confirma desde aquí. Si llegan los dos, solo uno hace el trabajo.
export async function GET(request: Request) {
  const caller = await requireCustomer();
  if (caller instanceof Response) return caller;

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId || !sessionId.startsWith("cs_")) return jsonError(400, "Falta session_id.");

  const order = await findOrderBySession(sessionId);
  // El mismo 404 si no existe y si es de otro cliente: no se revela nada.
  if (!order || order.customerId !== caller.sub) return jsonError(404, "No encontramos ese pedido.");

  if (order.status === "pending") {
    let session;
    try {
      session = await getStripe().checkout.sessions.retrieve(sessionId);
    } catch {
      return jsonError(502, "No pudimos consultar el pago en Stripe. Recargá en un momento.");
    }
    const intent = paymentIntentId(session);
    if (session.payment_status === "paid" && intent) {
      await confirmCheckoutPayment(sessionId, intent);
    }
  }
  return Response.json({ order: await findOrderBySession(sessionId) });
}
