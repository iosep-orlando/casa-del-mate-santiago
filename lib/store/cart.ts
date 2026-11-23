import type { ObjectId } from "mongodb";
import { buildCart, type CartItem } from "../cart";
import { collections, productToDTO, toObjectId } from "../db";
import type { CartDTO, ProductDTO } from "../types";

/** Los ítems guardados del carrito del cliente (id y cantidad). */
export async function getCartItems(customerId: ObjectId): Promise<CartItem[]> {
  const { carts } = await collections();
  const cart = await carts.findOne({ customerId });
  return (cart?.items ?? []).map((item) => ({
    productId: item.productId.toString(),
    quantity: item.quantity,
  }));
}

/** Guarda el carrito entero (upsert: el primero se crea al agregar algo). */
export async function saveCartItems(customerId: ObjectId, items: CartItem[]): Promise<void> {
  const { carts } = await collections();
  const docs = items.flatMap((item) => {
    const productId = toObjectId(item.productId);
    return productId ? [{ productId, quantity: item.quantity }] : [];
  });
  await carts.updateOne(
    { customerId },
    { $set: { items: docs, updatedAt: new Date() } },
    { upsert: true },
  );
}

/** El carrito cruzado con los productos actuales: precios, stock y problemas. */
export async function loadCart(customerId: ObjectId): Promise<CartDTO> {
  const items = await getCartItems(customerId);
  if (items.length === 0) return buildCart([], new Map());
  const { products } = await collections();
  const ids = items.flatMap((item) => toObjectId(item.productId) ?? []);
  const docs = await products.find({ _id: { $in: ids } }).toArray();
  const byId = new Map<string, ProductDTO>(docs.map((doc) => [doc._id.toString(), productToDTO(doc)]));
  return buildCart(items, byId);
}
