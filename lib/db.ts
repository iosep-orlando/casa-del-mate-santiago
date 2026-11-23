import { ObjectId, type Collection, type WithId } from "mongodb";
import { getDb } from "./mongodb";
import type { OrderDTO, OrderStatus, ProductDTO, Role, UserDTO } from "./types";

// ---------------------------------------------------------------------------
// Las cuatro colecciones del enunciado y sus índices.
// ---------------------------------------------------------------------------

export interface UserDoc {
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}

export interface ProductDoc {
  name: string;
  description: string;
  price: number; // centavos
  stock: number;
  category: string;
  imageUrl: string | null;
  active: boolean; // false: retirado del catálogo, pero sigue en los pedidos viejos
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemDoc {
  productId: ObjectId;
  quantity: number;
}

export interface CartDoc {
  customerId: ObjectId;
  items: CartItemDoc[];
  updatedAt: Date;
}

export interface OrderItemDoc {
  productId: ObjectId;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderDoc {
  customerId: ObjectId;
  customerEmail: string;
  customerName: string;
  items: OrderItemDoc[];
  total: number;
  status: OrderStatus;
  stripeSessionId: string | null;
  /**
   * Lo escribe quien confirma el pago (webhook o página de éxito), y solo si
   * todavía no estaba: así, si llegan los dos a la vez, el stock se descuenta
   * una sola vez.
   */
  paymentIntentId: string | null;
  stockApplied: boolean;
  refundId: string | null;
  cancelReason: string | null;
  createdAt: Date;
  paidAt: Date | null;
  updatedAt: Date;
}

let indexes: Promise<unknown> | undefined;

export async function collections() {
  const db = await getDb();
  const users: Collection<UserDoc> = db.collection("users");
  const products: Collection<ProductDoc> = db.collection("products");
  const carts: Collection<CartDoc> = db.collection("carts");
  const orders: Collection<OrderDoc> = db.collection("orders");
  // Una vez por proceso (createIndex es idempotente).
  indexes ??= Promise.all([
    users.createIndex({ email: 1 }, { unique: true, name: "email_unique" }),
    // El catálogo: activos, por categoría, más nuevos primero.
    products.createIndex({ active: 1, category: 1, createdAt: -1 }, { name: "catalog" }),
    // Un carrito por cliente.
    carts.createIndex({ customerId: 1 }, { unique: true, name: "cart_per_customer" }),
    // Historial del cliente y listado del admin.
    orders.createIndex({ customerId: 1, createdAt: -1 }, { name: "customer_orders" }),
    orders.createIndex({ status: 1, createdAt: -1 }, { name: "orders_by_status" }),
    // El webhook busca el pedido por la sesión de Stripe. Parcial: los
    // pedidos que no llegaron a tener sesión tienen null y no chocan.
    orders.createIndex(
      { stripeSessionId: 1 },
      {
        unique: true,
        name: "stripe_session_unique",
        partialFilterExpression: { stripeSessionId: { $type: "string" } },
      },
    ),
  ]);
  await indexes;
  return { users, products, carts, orders };
}

/** El ObjectId de un texto, o null si no es un id válido (evita un 500 con ids basura). */
export function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id ? new ObjectId(id) : null;
}

export function userToDTO(doc: WithId<UserDoc>): UserDTO {
  return { id: doc._id.toString(), email: doc.email, name: doc.name, role: doc.role };
}

export function productToDTO(doc: WithId<ProductDoc>): ProductDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    price: doc.price,
    stock: doc.stock,
    category: doc.category,
    imageUrl: doc.imageUrl,
    active: doc.active,
  };
}

export function orderToDTO(doc: WithId<OrderDoc>): OrderDTO {
  return {
    id: doc._id.toString(),
    customerId: doc.customerId.toString(),
    customerEmail: doc.customerEmail,
    customerName: doc.customerName,
    items: doc.items.map((item) => ({ ...item, productId: item.productId.toString() })),
    total: doc.total,
    status: doc.status,
    cancelReason: doc.cancelReason,
    refunded: doc.refundId !== null,
    createdAt: doc.createdAt.toISOString(),
    paidAt: doc.paidAt?.toISOString() ?? null,
  };
}

/** Error de índice único de MongoDB (código 11000): p. ej. un email repetido. */
export function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
