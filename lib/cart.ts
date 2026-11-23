import type { CartDTO, CartLineDTO, ProductDTO } from "./types";
import { MAX_QUANTITY } from "./validation";

// ---------------------------------------------------------------------------
// Lógica del carrito, sin base de datos: qué pasa al agregar o cambiar
// cantidades, y cómo queda el carrito cruzado con los productos de hoy.
// ---------------------------------------------------------------------------

export interface CartItem {
  productId: string;
  quantity: number;
}

/** Suma unidades; si el producto ya estaba, se acumula (hasta 99). */
export function addItem(items: CartItem[], productId: string, quantity: number): CartItem[] {
  const existing = items.find((item) => item.productId === productId);
  if (!existing) return [...items, { productId, quantity: Math.min(quantity, MAX_QUANTITY) }];
  return items.map((item) =>
    item.productId === productId
      ? { ...item, quantity: Math.min(item.quantity + quantity, MAX_QUANTITY) }
      : item,
  );
}

/** Fija la cantidad de un producto que ya está en el carrito. */
export function setQuantity(items: CartItem[], productId: string, quantity: number): CartItem[] {
  return items.map((item) => (item.productId === productId ? { ...item, quantity } : item));
}

export function removeItem(items: CartItem[], productId: string): CartItem[] {
  return items.filter((item) => item.productId !== productId);
}

/**
 * El carrito guarda solo id y cantidad; precio, nombre y stock se leen del
 * producto en cada visita. Así un cambio de precio se ve en el carrito antes
 * de pagar, y no al revés.
 *
 * Las líneas con problemas (producto borrado o retirado, sin stock o con
 * menos del que se pide) se muestran con el motivo y bloquean el pago hasta
 * que el cliente las arregle: mejor eso que cobrarle otra cosa de la que vio.
 */
export function buildCart(items: CartItem[], products: Map<string, ProductDTO>): CartDTO {
  const lines: CartLineDTO[] = [];
  for (const item of items) {
    const product = products.get(item.productId);
    if (!product) {
      // Borrado por el admin: no hay nada que mostrar ni que comprar.
      continue;
    }
    let problem: string | null = null;
    if (!product.active) problem = "Este producto ya no está a la venta.";
    else if (product.stock === 0) problem = "Sin stock por ahora.";
    else if (product.stock < item.quantity) {
      problem = `Solo quedan ${product.stock}. Bajá la cantidad para seguir.`;
    }
    lines.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity: item.quantity,
      stock: product.stock,
      subtotal: product.price * item.quantity,
      problem,
    });
  }
  const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return {
    lines,
    total,
    count,
    canCheckout: lines.length > 0 && lines.every((line) => line.problem === null),
  };
}
