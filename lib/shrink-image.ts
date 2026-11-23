import { MAX_IMAGE_BYTES, MAX_SOURCE_BYTES, fitWithin } from "./images";

// Solo en el navegador: achica una foto antes de subirla. Una foto de
// celular (4000 px, 3-8 MB) queda en 1000 px y unos 100 KB en WebP, que
// alcanza de sobra para el catálogo y la página del producto.

export class ImageProblem extends Error {}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
}

export async function shrinkImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new ImageProblem("Ese archivo no es una imagen.");
  if (file.size > MAX_SOURCE_BYTES) throw new ImageProblem("La foto pesa más de 20 MB. Elegí otra.");

  let bitmap: ImageBitmap;
  try {
    // from-image: respeta la rotación que guarda el celular en la foto.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Pasa con HEIC (iPhone) en navegadores que no lo leen.
    throw new ImageProblem("No se pudo leer esa foto. Probá con una JPG o PNG.");
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // WebP si el navegador lo sabe escribir (Safari viejo no): si no, JPEG.
  let blob = await toBlob(canvas, "image/webp");
  if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg");
  if (!blob) throw new ImageProblem("No se pudo preparar la foto.");
  if (blob.size > MAX_IMAGE_BYTES) throw new ImageProblem("La foto sigue siendo demasiado grande.");
  return blob;
}
