import { describe, expect, it } from "vitest";
import {
  CHECKOUT_TTL_SECONDS,
  STALE_PENDING_MS,
  allowedAdminTransitions,
  canAdminTransition,
  isOrderStatus,
} from "@/lib/orders";

describe("estados del pedido", () => {
  it("el admin nunca marca 'pagado' a mano", () => {
    for (const from of ["pending", "paid", "shipped", "cancelled"] as const) {
      expect(canAdminTransition(from, "paid")).toBe(false);
    }
  });

  it("transiciones permitidas", () => {
    expect(allowedAdminTransitions("pending")).toEqual(["cancelled"]);
    expect(allowedAdminTransitions("paid")).toEqual(["shipped", "cancelled"]);
    expect(allowedAdminTransitions("shipped")).toEqual([]);
    expect(canAdminTransition("cancelled", "shipped")).toBe(false);
    expect(canAdminTransition("pending", "shipped")).toBe(false); // sin pagar no se envía
  });

  it("isOrderStatus", () => {
    expect(isOrderStatus("shipped")).toBe(true);
    expect(isOrderStatus("refunded")).toBe(false);
    expect(isOrderStatus(undefined)).toBe(false);
  });

  it("un pendiente se da por vencido después de que Stripe cierra la sesión", () => {
    expect(STALE_PENDING_MS).toBeGreaterThan(CHECKOUT_TTL_SECONDS * 1000);
  });
});
