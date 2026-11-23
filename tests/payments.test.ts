import { describe, expect, it, vi } from "vitest";
import {
  OUT_OF_STOCK_REASON,
  REFUND_PENDING,
  confirmPayment,
  takeStock,
  type PaymentDeps,
} from "@/lib/payments";

/**
 * Una tienda en memoria con las mismas reglas que MongoDB: el pedido se
 * reclama una sola vez y el stock solo baja si alcanza.
 */
function memoryStore(stock: Record<string, number>) {
  const order = {
    id: "o1",
    customerId: "c1",
    sessionId: "cs_1",
    status: "pending",
    claimedBy: null as string | null,
    items: [
      { productId: "yerba", quantity: 2 },
      { productId: "mate", quantity: 1 },
    ],
    cancelReason: null as string | null,
    refundId: null as string | null,
  };
  const cartCleared: string[] = [];
  const deps: PaymentDeps = {
    claim: vi.fn(async (sessionId, intent) => {
      if (sessionId !== order.sessionId || order.status !== "pending" || order.claimedBy) return null;
      order.claimedBy = intent;
      return { id: order.id, customerId: order.customerId, items: order.items };
    }),
    takeOne: vi.fn(async ({ productId, quantity }) => {
      if ((stock[productId] ?? 0) < quantity) return false;
      stock[productId] -= quantity;
      return true;
    }),
    giveBack: vi.fn(async ({ productId, quantity }) => {
      stock[productId] += quantity;
    }),
    markPaid: vi.fn(async () => {
      order.status = "paid";
    }),
    clearCart: vi.fn(async (customerId) => {
      cartCleared.push(customerId);
    }),
    refund: vi.fn(async () => "re_1"),
    markCancelled: vi.fn(async (_id, reason, refundId) => {
      order.status = "cancelled";
      order.cancelReason = reason;
      order.refundId = refundId;
    }),
  };
  return { deps, order, stock, cartCleared };
}

describe("confirmPayment", () => {
  it("con stock: marca pagado, descuenta y vacía el carrito", async () => {
    const { deps, order, stock, cartCleared } = memoryStore({ yerba: 5, mate: 1 });
    expect(await confirmPayment(deps, "cs_1", "pi_1")).toBe("paid");
    expect(order.status).toBe("paid");
    expect(stock).toEqual({ yerba: 3, mate: 0 });
    expect(cartCleared).toEqual(["c1"]);
    expect(deps.refund).not.toHaveBeenCalled();
  });

  it("webhook y página de éxito a la vez: el stock se descuenta una sola vez", async () => {
    const { deps, stock } = memoryStore({ yerba: 5, mate: 1 });
    const results = await Promise.all([
      confirmPayment(deps, "cs_1", "pi_1"),
      confirmPayment(deps, "cs_1", "pi_1"),
    ]);
    expect(results.sort()).toEqual(["already-handled", "paid"]);
    expect(stock).toEqual({ yerba: 3, mate: 0 });
  });

  it("una sesión desconocida no toca nada", async () => {
    const { deps, stock } = memoryStore({ yerba: 5, mate: 1 });
    expect(await confirmPayment(deps, "cs_otro", "pi_1")).toBe("already-handled");
    expect(deps.takeOne).not.toHaveBeenCalled();
    expect(stock).toEqual({ yerba: 5, mate: 1 });
  });

  it("si se agotó mientras pagaba: devuelve el stock tomado, reembolsa y cancela", async () => {
    const { deps, order, stock, cartCleared } = memoryStore({ yerba: 5, mate: 0 });
    expect(await confirmPayment(deps, "cs_1", "pi_1")).toBe("out-of-stock");
    expect(stock).toEqual({ yerba: 5, mate: 0 }); // la yerba descontada volvió
    expect(deps.refund).toHaveBeenCalledWith("pi_1");
    expect(order).toMatchObject({ status: "cancelled", cancelReason: OUT_OF_STOCK_REASON, refundId: "re_1" });
    expect(cartCleared).toEqual([]); // el carrito queda para que lo revise
  });

  it("si Stripe no deja reembolsar, el pedido lo dice", async () => {
    const { deps, order } = memoryStore({ yerba: 0, mate: 0 });
    deps.refund = vi.fn(async () => null);
    expect(await confirmPayment(deps, "cs_1", "pi_1")).toBe("out-of-stock");
    expect(order.cancelReason).toContain(REFUND_PENDING);
    expect(order.refundId).toBeNull();
  });
});

describe("takeStock", () => {
  it("todo o nada", async () => {
    const stock: Record<string, number> = { a: 1, b: 1, c: 0 };
    const deps = {
      takeOne: async ({ productId, quantity }: { productId: string; quantity: number }) => {
        if (stock[productId] < quantity) return false;
        stock[productId] -= quantity;
        return true;
      },
      giveBack: async ({ productId, quantity }: { productId: string; quantity: number }) => {
        stock[productId] += quantity;
      },
    };
    const lines = ["a", "b", "c"].map((productId) => ({ productId, quantity: 1 }));
    expect(await takeStock(deps, lines)).toBe(false);
    expect(stock).toEqual({ a: 1, b: 1, c: 0 });
    expect(await takeStock(deps, lines.slice(0, 2))).toBe(true);
    expect(stock).toEqual({ a: 0, b: 0, c: 0 });
  });
});
