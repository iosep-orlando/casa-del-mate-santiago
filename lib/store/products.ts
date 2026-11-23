import type { Filter } from "mongodb";
import { collections, productToDTO, toObjectId, type ProductDoc } from "../db";
import { searchPatterns } from "../search";
import type { ProductDTO } from "../types";
import type { ProductInput } from "../validation";

export interface CatalogFilter {
  q?: string;
  category?: string;
}

/** El catálogo público: solo productos activos, con búsqueda y categoría. */
export async function listCatalog(filter: CatalogFilter): Promise<ProductDTO[]> {
  const { products } = await collections();
  const query: Filter<ProductDoc> = { active: true };
  if (filter.category) query.category = filter.category;
  const patterns = searchPatterns(filter.q ?? "");
  if (patterns.length > 0) {
    // Cada palabra tiene que aparecer en el nombre, la descripción o la categoría.
    query.$and = patterns.map((pattern) => ({
      $or: [
        { name: { $regex: pattern, $options: "i" } },
        { description: { $regex: pattern, $options: "i" } },
        { category: { $regex: pattern, $options: "i" } },
      ],
    }));
  }
  const docs = await products.find(query).sort({ createdAt: -1 }).limit(200).toArray();
  return docs.map(productToDTO);
}

/** Las categorías con algún producto a la venta, para los filtros. */
export async function listCategories(): Promise<string[]> {
  const { products } = await collections();
  const categories = await products.distinct("category", { active: true });
  return categories.sort((a, b) => a.localeCompare(b, "es"));
}

/** Todas las categorías usadas, para sugerirlas en el formulario del admin. */
export async function listAllCategories(): Promise<string[]> {
  const { products } = await collections();
  const categories = await products.distinct("category");
  return categories.sort((a, b) => a.localeCompare(b, "es"));
}

/** Un producto por id. Con onlyActive, los retirados no se encuentran. */
export async function getProduct(id: string, onlyActive = false): Promise<ProductDTO | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  const { products } = await collections();
  const doc = await products.findOne(onlyActive ? { _id, active: true } : { _id });
  return doc ? productToDTO(doc) : null;
}

/** Para el admin: todos, también los retirados y sin stock. */
export async function listAllProducts(): Promise<ProductDTO[]> {
  const { products } = await collections();
  const docs = await products.find().sort({ category: 1, name: 1 }).toArray();
  return docs.map(productToDTO);
}

export async function createProduct(input: ProductInput): Promise<ProductDTO> {
  const { products } = await collections();
  const now = new Date();
  const doc: ProductDoc = { ...input, createdAt: now, updatedAt: now };
  const { insertedId } = await products.insertOne(doc);
  return productToDTO({ ...doc, _id: insertedId });
}

export async function updateProduct(id: string, input: ProductInput): Promise<ProductDTO | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  const { products } = await collections();
  const doc = await products.findOneAndUpdate(
    { _id },
    { $set: { ...input, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return doc ? productToDTO(doc) : null;
}

/**
 * Borrar de verdad. Los pedidos no se rompen: guardan su propia copia del
 * nombre y el precio. Se saca también de los carritos donde estaba.
 */
export async function deleteProduct(id: string): Promise<boolean> {
  const _id = toObjectId(id);
  if (!_id) return false;
  const { products, carts } = await collections();
  const { deletedCount } = await products.deleteOne({ _id });
  if (deletedCount === 0) return false;
  await carts.updateMany({ "items.productId": _id }, { $pull: { items: { productId: _id } } });
  return true;
}
