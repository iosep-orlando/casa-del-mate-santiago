import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { CHECKOUT_TTL_SECONDS } from "@/lib/orders";
import { absoluteImage, checkoutSessionParams, getStripe, paymentIntentId } from "@/lib/stripe";

describe("checkoutSessionParams", () => {
  const now = new Date("2026-11-22T23:00:00Z");
  const params = checkoutSessionParams({
    orderId: "o1",
    customerEmail: "ana@mail.com",
    origin: "https://casa-del-mate-santiago.onrender.com",
    now,
    items: [
      { name: "Yerba", price: 680_000, quantity: 2, imageUrl: "/productos/yerba.svg" },
      { name: "Mate", price: 1_490_000, quantity: 1, imageUrl: null },
    ],
  });

  it("cobra en pesos, en centavos, con los precios de la base", () => {
    expect(params.line_items).toEqual([
      {
        quantity: 2,
        price_data: {
          currency: "ars",
          unit_amount: 680_000,
          product_data: { name: "Yerba", images: ["https://casa-del-mate-santiago.onrender.com/productos/yerba.svg"] },
        },
      },
      { quantity: 1, price_data: { currency: "ars", unit_amount: 1_490_000, product_data: { name: "Mate" } } },
    ]);
  });

  it("lleva el pedido, las URL de vuelta y vence a la media hora", () => {
    expect(params).toMatchObject({
      mode: "payment",
      customer_email: "ana@mail.com",
      client_reference_id: "o1",
      metadata: { orderId: "o1" },
      success_url: "https://casa-del-mate-santiago.onrender.com/checkout/exito?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://casa-del-mate-santiago.onrender.com/checkout/cancelado?pedido=o1",
    });
    expect(params.expires_at).toBe(now.getTime() / 1000 + CHECKOUT_TTL_SECONDS);
  });
});

describe("absoluteImage", () => {
  it("solo URL https que Stripe pueda descargar", () => {
    expect(absoluteImage(null, "https://x.com")).toBeNull();
    expect(absoluteImage("/p.svg", "http://localhost:3000")).toBeNull();
    expect(absoluteImage("https://cdn.com/a.jpg", "http://localhost:3000")).toBe("https://cdn.com/a.jpg");
  });
});

describe("paymentIntentId", () => {
  it("texto, objeto expandido o nada", () => {
    const session = (pi: unknown) => ({ payment_intent: pi }) as Stripe.Checkout.Session;
    expect(paymentIntentId(session("pi_1"))).toBe("pi_1");
    expect(paymentIntentId(session({ id: "pi_2" }))).toBe("pi_2");
    expect(paymentIntentId(session(null))).toBeNull();
  });
});

describe("getStripe", () => {
  it("se crea al primer uso y se reutiliza", () => {
    expect(getStripe()).toBe(getStripe());
  });
});
