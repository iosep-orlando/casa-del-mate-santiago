// Tipos que viajan al navegador (DTO): ids como texto y fechas en ISO.
// Los documentos de MongoDB, con ObjectId y Date, están en lib/db.ts.

export type Role = "admin" | "customer";

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface ProductDTO {
  id: string;
  name: string;
  description: string;
  price: number; // centavos
  stock: number;
  category: string;
  imageUrl: string | null;
  active: boolean;
}

export type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";

export interface OrderItemDTO {
  productId: string;
  name: string; // copia del nombre y el precio al comprar: si el producto
  price: number; // cambia o se borra, el pedido sigue diciendo lo que se pagó
  quantity: number;
}

export interface OrderDTO {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  items: OrderItemDTO[];
  total: number;
  status: OrderStatus;
  cancelReason: string | null;
  refunded: boolean;
  createdAt: string;
  paidAt: string | null;
}

/** Una línea del carrito, ya cruzada con el producto actual. */
export interface CartLineDTO {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  stock: number;
  subtotal: number;
  /** Por qué no se puede comprar tal cual: sin stock, menos stock, retirado. */
  problem: string | null;
}

export interface CartDTO {
  lines: CartLineDTO[];
  total: number;
  count: number; // unidades, para el globito de la cabecera
  canCheckout: boolean;
}
