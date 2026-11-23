// ---------------------------------------------------------------------------
// Dinero en pesos argentinos. Todo se guarda y se calcula en centavos
// (enteros): 0,1 + 0,2 da 0,30000000000000004 en coma flotante, y en una
// tienda esos restos terminan en un total que no cuadra con lo cobrado.
// Solo se pasa a texto al mostrarlo.
// ---------------------------------------------------------------------------

// "17500", "17.500", "1.250,5", "1250,50". Con puntos de miles, los grupos
// tienen que ser de tres cifras: "12.5" no se acepta, porque en Argentina no
// está claro si son doce pesos y medio o doce mil quinientos.
const AMOUNT_RE = /^(\d{1,3}(?:\.\d{3})+|\d{1,9})(?:,(\d{1,2}))?$/;

/** El precio más alto que se acepta: $ 9.999.999,99, con holgura bajo el límite de Stripe. */
export const MAX_PRICE_CENTS = 999_999_999;

/**
 * "1.250,50" → 125050. Se trabaja con el texto, no con parseFloat: 19,99 * 100
 * da 1998,9999999999998 en coma flotante.
 * Devuelve null si el importe no es válido o no es mayor que 0.
 */
export function parsePesos(input: string): number | null {
  const match = input.replace(/\s/g, "").replace(/^\$/, "").match(AMOUNT_RE);
  if (!match) return null;
  const pesos = Number(match[1].replace(/\./g, ""));
  const centavos = Number((match[2] ?? "0").padEnd(2, "0"));
  const total = pesos * 100 + centavos;
  return total > 0 && total <= MAX_PRICE_CENTS ? total : null;
}

const pesosFormat = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const pesosWithCentsFormat = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

/** 1750000 → "$ 17.500"; 125050 → "$ 1.250,50". Los centavos, solo si los hay. */
export function formatPesos(cents: number): string {
  return cents % 100 === 0
    ? pesosFormat.format(cents / 100)
    : pesosWithCentsFormat.format(cents / 100);
}

/** Para el campo de precio del formulario: 125050 → "1.250,50"; 1750000 → "17.500". */
export function centsToInput(cents: number): string {
  return formatPesos(cents).replace(/^\$\s*/, "").replace(/ /g, "");
}
