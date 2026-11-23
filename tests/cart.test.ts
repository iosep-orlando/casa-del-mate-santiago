import { describe, expect, it } from "vitest";
import { addItem, buildCart, removeItem, setQuantity } from "@/lib/cart";
import type { ProductDTO } from "@/lib/types";

const yerba: ProductDTO = {
  id: "a",
  name: "Yerba",
  description: "",
  price: 680_000,
  stock: 10,
  category: "Yerbas",
  imageUrl: null,
  active: true,
};
const mate: ProductDTO = { ...yerba, id: "b", name: "Mate", price: 1_490_000, stock: 2 };

describe("operaciones del carrito", () => {
  it("agregar acumula y no pasa de 99", () => {
    let items = addItem([], "a", 2);
    items = addItem(items, "a", 3);
    expect(items).toEqual([{ productId: "a", quantity: 5 }]);
    expect(addItem(items, "a", 98)).toEqual([{ productId: "a", quantity: 99 }]);
    expect(addItem(items, "b", 1)).toHaveLength(2);
  });

  it("fijar cantidad y quitar", () => {
    const items = [{ productId: "a", quantity: 1 }, { productId: "b", quantity: 1 }];
    expect(setQuantity(items, "b", 4)[1].quantity).toBe(4);
    expect(removeItem(items, "a")).toEqual([{ productId: "b", quantity: 1 }]);
  });
});

describe("buildCart", () => {
  const products = new Map([["a", yerba], ["b", mate]]);

  it("calcula subtotales, total y unidades con los precios actuales", () => {
    const cart = buildCart([{ productId: "a", quantity: 2 }, { productId: "b", quantity: 1 }], products);
    expect(cart.lines.map((l) => l.subtotal)).toEqual([1_360_000, 1_490_000]);
    expect(cart.total).toBe(2_850_000);
    expect(cart.count).toBe(3);
    expect(cart.canCheckout).toBe(true);
  });

  it("marca los problemas y bloquea el pago", () => {
    const tooMany = buildCart([{ productId: "b", quantity: 3 }], products);
    expect(tooMany.lines[0].problem).toContain("Solo quedan 2");
    expect(tooMany.canCheckout).toBe(false);

    const soldOut = buildCart([{ productId: "a", quantity: 1 }], new Map([["a", { ...yerba, stock: 0 }]]));
    expect(soldOut.lines[0].problem).toContain("Sin stock");

    const retired = buildCart([{ productId: "a", quantity: 1 }], new Map([["a", { ...yerba, active: false }]]));
    expect(retired.lines[0].problem).toContain("ya no está a la venta");
  });

  it("ignora productos borrados; un carrito vacío no se puede pagar", () => {
    const cart = buildCart([{ productId: "borrado", quantity: 1 }], products);
    expect(cart.lines).toEqual([]);
    expect(cart.canCheckout).toBe(false);
  });
});
