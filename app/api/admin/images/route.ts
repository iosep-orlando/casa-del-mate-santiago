import { jsonError, requireAdmin } from "@/lib/api";
import { MAX_IMAGE_BYTES, detectImageType, uploadedImageUrl } from "@/lib/images";
import { saveImage } from "@/lib/store/images";

// Subir una foto de producto. El cuerpo es la imagen tal cual (ya achicada en
// el navegador). Devuelve la URL para guardar en el producto.
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES) return jsonError(413, "La foto es demasiado grande.");
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0) return jsonError(400, "No llegó ninguna foto.");
  if (bytes.length > MAX_IMAGE_BYTES) return jsonError(413, "La foto es demasiado grande.");

  const type = detectImageType(bytes);
  if (!type) return jsonError(415, "Ese archivo no es una foto JPG, PNG o WebP.");

  const id = await saveImage(bytes, type);
  return Response.json({ url: uploadedImageUrl(id) }, { status: 201 });
}
