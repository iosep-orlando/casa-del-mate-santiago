import Link from "next/link";
import { formatPesos } from "@/lib/money";
import type { ProductDTO } from "@/lib/types";
import ProductImage from "./ProductImage";
import StockNote from "./StockNote";

export default function ProductCard({ product }: { product: ProductDTO }) {
  return (
    <Link
      href={`/productos/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-line bg-white hover:border-yerba"
    >
      <ProductImage src={product.imageUrl} name={product.name} />
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs font-semibold text-hoja">{product.category}</p>
        <h2 className="font-semibold leading-snug group-hover:underline">{product.name}</h2>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <p className="tabular text-lg font-bold">{formatPesos(product.price)}</p>
          <StockNote stock={product.stock} />
        </div>
      </div>
    </Link>
  );
}
