import { Binary, type Collection } from "mongodb";
import { getDb } from "../mongodb";
import { toObjectId } from "../db";
import { uploadedImageId, type ImageType } from "../images";

export interface ImageDoc {
  data: Binary;
  contentType: ImageType;
  size: number;
  createdAt: Date;
}

async function images(): Promise<Collection<ImageDoc>> {
  return (await getDb()).collection<ImageDoc>("images");
}

export async function saveImage(bytes: Uint8Array, contentType: ImageType): Promise<string> {
  const { insertedId } = await (await images()).insertOne({
    data: new Binary(Buffer.from(bytes)),
    contentType,
    size: bytes.length,
    createdAt: new Date(),
  });
  return insertedId.toString();
}

export async function getImage(id: string): Promise<{ bytes: Uint8Array; contentType: ImageType } | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  const doc = await (await images()).findOne({ _id });
  if (!doc) return null;
  return { bytes: Buffer.from(doc.data.buffer).subarray(0, doc.size), contentType: doc.contentType };
}

/**
 * Borra la foto subida que ya no usa ningún producto (al cambiarla o al
 * borrar el producto). Las URL de afuera o de /productos/ no se tocan.
 */
export async function deleteImageIfUploaded(url: string | null): Promise<void> {
  const _id = toObjectId(uploadedImageId(url) ?? "");
  if (_id) await (await images()).deleteOne({ _id });
}
