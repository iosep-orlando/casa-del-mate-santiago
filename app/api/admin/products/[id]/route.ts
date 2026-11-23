import { jsonError, readJson, requireAdmin } from "@/lib/api";
import { deleteProduct, getProduct, updateProduct } from "@/lib/store/products";
import { validateProduct } from "@/lib/validation";

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/products/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const product = await getProduct((await ctx.params).id);
  return product ? Response.json({ product }) : jsonError(404, "No existe ese producto.");
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/products/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const body = await readJson(request);
  if (!body) return jsonError(400, "Cuerpo JSON inválido.");
  const input = validateProduct(body);
  if (!input.ok) return jsonError(400, input.error);
  const product = await updateProduct((await ctx.params).id, input.value);
  return product ? Response.json({ product }) : jsonError(404, "No existe ese producto.");
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/products/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const deleted = await deleteProduct((await ctx.params).id);
  return deleted ? new Response(null, { status: 204 }) : jsonError(404, "No existe ese producto.");
}
