import { LOW_STOCK_NOTE } from "@/lib/catalog";

/** Solo se avisa cuando importa: sin stock o quedan pocas. */
export default function StockNote({ stock }: { stock: number }) {
  if (stock === 0) return <span className="text-sm font-semibold text-danger">Sin stock</span>;
  if (stock <= LOW_STOCK_NOTE) {
    return <span className="text-sm font-semibold text-hoja">{stock === 1 ? "Queda 1" : `Quedan ${stock}`}</span>;
  }
  return null;
}
