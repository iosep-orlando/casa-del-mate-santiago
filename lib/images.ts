// ---------------------------------------------------------------------------
// Fotos de producto subidas desde la computadora.
//
// Se guardan en MongoDB (colección `images`) y se sirven en
// /api/images/<id>. No en el disco del servidor: en el plan gratuito de
// Render ese disco se borra en cada despliegue. Antes de subir, el navegador
// achica la foto (lado mayor 1000 px, WebP): de varios MB del celular quedan
// unos 100 KB, y en los 512 MB gratuitos de Atlas entran miles.
// ---------------------------------------------------------------------------

/** Lado mayor de la foto ya achicada, en píxeles. */
export const MAX_IMAGE_SIDE = 1000;

/** Lo máximo que acepta el servidor, ya achicada. */
export const MAX_IMAGE_BYTES = 1_500_000;

/** Lo máximo que se deja elegir en la computadora, antes de achicar. */
export const MAX_SOURCE_BYTES = 20_000_000;

export type ImageType = "image/webp" | "image/jpeg" | "image/png";

/**
 * El tipo real de la imagen por sus primeros bytes, no por lo que diga el
 * navegador o el nombre del archivo: así no se puede subir otra cosa
 * (un HTML, un ejecutable) con la etiqueta de imagen.
 */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  const ascii = (start: number, text: string) =>
    [...text].every((char, i) => bytes[start + i] === char.charCodeAt(0));
  if (bytes.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) {
    return "image/png";
  }
  return null;
}

/** Medidas para que el lado mayor no pase de `max`, sin agrandar nunca. */
export function fitWithin(width: number, height: number, max = MAX_IMAGE_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

const UPLOADED_RE = /^\/api\/images\/([0-9a-f]{24})$/;

/** El id de una foto subida a partir de su URL, o null si es otra URL. */
export function uploadedImageId(url: string | null | undefined): string | null {
  return url?.match(UPLOADED_RE)?.[1] ?? null;
}

export function uploadedImageUrl(id: string): string {
  return `/api/images/${id}`;
}
