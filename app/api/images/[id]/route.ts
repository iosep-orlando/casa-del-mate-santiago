import { getImage } from "@/lib/store/images";

// Sirve una foto subida. Pública, como el catálogo. Una foto nunca cambia
// (cambiarla crea otra con otro id), así que el navegador la puede guardar
// en caché para siempre.
export async function GET(_request: Request, ctx: RouteContext<"/api/images/[id]">) {
  const image = await getImage((await ctx.params).id);
  if (!image) return new Response("No existe esa foto.", { status: 404 });
  return new Response(Buffer.from(image.bytes), {
    headers: {
      "content-type": image.contentType,
      "cache-control": "public, max-age=31536000, immutable",
      // Que el navegador no adivine otro tipo que el declarado.
      "x-content-type-options": "nosniff",
    },
  });
}
