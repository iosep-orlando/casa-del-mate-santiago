// Búsqueda del catálogo: el texto que escribe el cliente, convertido en una
// expresión regular segura para MongoDB.

const ACCENTS: Record<string, string> = {
  a: "[aáàä]",
  e: "[eéèë]",
  i: "[iíìï]",
  o: "[oóòö]",
  u: "[uúùü]",
  n: "[nñ]",
};

/**
 * "termo acero" → busca "termo" y "acero" (en cualquier orden) sin importar
 * mayúsculas ni tildes: "bombilla alpaca" encuentra "Bombilla de Alpaca".
 *
 * Cada carácter especial se escapa: sin eso, buscar "(" rompería la consulta
 * y ".*" lo encontraría todo.
 * Devuelve un patrón por palabra, o [] si no hay nada que buscar.
 */
export function searchPatterns(query: string): string[] {
  return query
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // "pequeño" → "pequeno": la tilde la cubre la clase
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5) // más palabras no mejoran la búsqueda y alargan la consulta
    .map((word) =>
      [...word]
        .map((char) => ACCENTS[char] ?? char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(""),
    );
}

/** Para mostrar el filtro activo y armar los enlaces del catálogo. */
export function catalogHref(params: { q?: string; categoria?: string }): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.categoria) search.set("categoria", params.categoria);
  const qs = search.toString();
  return qs ? `/?${qs}` : "/";
}
