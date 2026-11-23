/** Desde cuántas unidades se avisa "quedan pocas" en el catálogo. */
export const LOW_STOCK_NOTE = 3;

/** Los filtros del catálogo leídos de la URL (?q=…&categoria=…). */
export function readCatalogParams(params: Record<string, string | string[] | undefined>): {
  q: string;
  category: string;
} {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  return { q: first(params.q).trim().slice(0, 100), category: first(params.categoria).trim().slice(0, 40) };
}
