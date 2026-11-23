import { addItem, removeItem, setQuantity } from "@/lib/cart";
import { jsonError, readJson, requireCustomer } from "@/lib/api";
import { getProduct } from "@/lib/store/products";
import { getCartItems, loadCart, saveCartItems } from "@/lib/store/cart";
import { validateQuantity } from "@/lib/validation";

// El carrito del cliente, guardado en MongoDB: sigue ahí en otro dispositivo
// o después de cerrar el navegador.

export async function GET() {
  const caller = await requireCustomer();
  if (caller instanceof Response) return caller;
  return Response.json(await loadCart(caller.userId));
}

/** Agregar unidades de un producto: { productId, quantity }. */
export async function POST(request: Request) {
  return change(request, "add");
}

/** Fijar la cantidad de un producto que ya está: { productId, quantity }. */
export async function PATCH(request: Request) {
  return change(request, "set");
}

/** Quitar un producto: { productId }. */
export async function DELETE(request: Request) {
  const caller = await requireCustomer();
  if (caller instanceof Response) return caller;
  const body = await readJson(request);
  if (!body || typeof body.productId !== "string") return jsonError(400, "Falta productId.");
  const items = await getCartItems(caller.userId);
  await saveCartItems(caller.userId, removeItem(items, body.productId));
  return Response.json(await loadCart(caller.userId));
}

async function change(request: Request, mode: "add" | "set") {
  const caller = await requireCustomer();
  if (caller instanceof Response) return caller;
  const body = await readJson(request);
  if (!body || typeof body.productId !== "string") return jsonError(400, "Falta productId.");
  const quantity = validateQuantity(body.quantity);
  if (!quantity.ok) return jsonError(400, quantity.error);

  const product = await getProduct(body.productId, true);
  if (!product) return jsonError(404, "Ese producto no existe o ya no está a la venta.");

  const items = await getCartItems(caller.userId);
  const inCart = items.find((item) => item.productId === product.id)?.quantity ?? 0;
  if (mode === "set" && inCart === 0) return jsonError(404, "Ese producto no está en tu carrito.");
  const wanted = mode === "add" ? inCart + quantity.value : quantity.value;

  // Se avisa ya, al agregar; el stock se vuelve a comprobar al pagar.
  if (product.stock === 0) return jsonError(409, "Este producto está sin stock.");
  if (wanted > product.stock) {
    const already = inCart > 0 && mode === "add" ? ` y ya tenés ${inCart} en el carrito` : "";
    return jsonError(409, `Solo quedan ${product.stock}${already}.`);
  }

  const next =
    mode === "add"
      ? addItem(items, product.id, quantity.value)
      : setQuantity(items, product.id, quantity.value);
  await saveCartItems(caller.userId, next);
  return Response.json(await loadCart(caller.userId));
}
