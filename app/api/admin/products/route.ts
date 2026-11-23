import { jsonError, readJson, requireAdmin } from "@/lib/api";
import { createProduct, listAllProducts } from "@/lib/store/products";
import { validateProduct } from "@/lib/validation";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  return Response.json({ products: await listAllProducts() });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const body = await readJson(request);
  if (!body) return jsonError(400, "Cuerpo JSON inválido.");
  const input = validateProduct(body);
  if (!input.ok) return jsonError(400, input.error);
  return Response.json({ product: await createProduct(input.value) }, { status: 201 });
}
