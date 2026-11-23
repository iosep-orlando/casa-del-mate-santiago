import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// El webhook sin MongoDB: las funciones de la base se sustituyen por espías.
vi.mock("@/lib/store/orders", () => ({
  confirmCheckoutPayment: vi.fn(async () => "paid"),
  cancelExpiredSession: vi.fn(async () => undefined),
}));

const { POST } = await import("@/app/api/stripe/webhook/route");
const { cancelExpiredSession, confirmCheckoutPayment } = await import("@/lib/store/orders");

const stripe = new Stripe("sk_test_solo_para_tests");
const SECRET = "whsec_solo_para_tests";

function event(type: string, session: Record<string, unknown>) {
  return JSON.stringify({ id: "evt_1", object: "event", type, data: { object: { id: "cs_1", object: "checkout.session", ...session } } });
}

function signedRequest(payload: string, secret = SECRET) {
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: payload,
  });
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pago completado con firma válida: confirma el pedido", async () => {
    const res = await POST(signedRequest(event("checkout.session.completed", { payment_status: "paid", payment_intent: "pi_1" })));
    expect(res.status).toBe(200);
    expect(confirmCheckoutPayment).toHaveBeenCalledWith("cs_1", "pi_1");
  });

  it("completado pero sin cobrar todavía (pago diferido): no confirma", async () => {
    await POST(signedRequest(event("checkout.session.completed", { payment_status: "unpaid", payment_intent: "pi_1" })));
    expect(confirmCheckoutPayment).not.toHaveBeenCalled();
  });

  it("sesión vencida: cancela el pendiente", async () => {
    const res = await POST(signedRequest(event("checkout.session.expired", { payment_status: "unpaid" })));
    expect(res.status).toBe(200);
    expect(cancelExpiredSession).toHaveBeenCalledWith("cs_1");
  });

  it("otros eventos: 200 sin hacer nada", async () => {
    const res = await POST(signedRequest(event("customer.created", {})));
    expect(res.status).toBe(200);
    expect(confirmCheckoutPayment).not.toHaveBeenCalled();
  });

  it("firma de otro secreto, cuerpo alterado o sin firma: 400 y nada marcado", async () => {
    const payload = event("checkout.session.completed", { payment_status: "paid", payment_intent: "pi_1" });
    expect((await POST(signedRequest(payload, "whsec_otro"))).status).toBe(400);

    const altered = signedRequest(payload);
    const tampered = new Request(altered.url, {
      method: "POST",
      headers: altered.headers,
      body: payload.replace("pi_1", "pi_2"),
    });
    expect((await POST(tampered)).status).toBe(400);

    const unsigned = new Request("http://localhost/api/stripe/webhook", { method: "POST", body: payload });
    expect((await POST(unsigned)).status).toBe(400);
    expect(confirmCheckoutPayment).not.toHaveBeenCalled();
  });

  it("sin STRIPE_WEBHOOK_SECRET configurado: 500 con el motivo", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    const res = await POST(signedRequest(event("checkout.session.completed", {})));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("STRIPE_WEBHOOK_SECRET");
    vi.unstubAllEnvs();
  });
});
