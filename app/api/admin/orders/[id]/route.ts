import { jsonError, readJson, requireAdmin } from "@/lib/api";
import { isOrderStatus } from "@/lib/orders";
import { changeOrderStatus } from "@/lib/store/orders";

// Cambiar el estado de un pedido: { status: "shipped" | "cancelled" }.
// Cancelar un pedido pagado devuelve el dinero por Stripe y repone el stock.
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const body = await readJson(request);
  if (!body || !isOrderStatus(body.status)) return jsonError(400, "Estado inválido.");
  const result = await changeOrderStatus((await ctx.params).id, body.status);
  return result.ok ? Response.json({ order: result.order }) : jsonError(result.status, result.error);
}
