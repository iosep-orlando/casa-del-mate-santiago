import { describe, expect, it } from "vitest";
import { MAX_PRICE_CENTS, centsToInput, formatPesos, parsePesos } from "@/lib/money";

describe("parsePesos", () => {
  it("acepta los formatos argentinos y devuelve centavos", () => {
    expect(parsePesos("17500")).toBe(1_750_000);
    expect(parsePesos("17.500")).toBe(1_750_000);
    expect(parsePesos("1.250,5")).toBe(125_050);
    expect(parsePesos("1250,50")).toBe(125_050);
    expect(parsePesos("$ 6.800")).toBe(680_000);
    expect(parsePesos("19,99")).toBe(1999); // sin errores de coma flotante
  });

  it("rechaza lo ambiguo, lo vacío, el cero y lo que pasa del máximo", () => {
    expect(parsePesos("12.5")).toBeNull(); // ¿12,5 o 12.500?
    expect(parsePesos("")).toBeNull();
    expect(parsePesos("0")).toBeNull();
    expect(parsePesos("-5")).toBeNull();
    expect(parsePesos("abc")).toBeNull();
    expect(parsePesos("1,234")).toBeNull(); // tres decimales
    expect(parsePesos("10.000.000")).toBeNull();
    expect(parsePesos("9.999.999,99")).toBe(MAX_PRICE_CENTS);
  });
});

describe("formatPesos", () => {
  it("muestra centavos solo si los hay", () => {
    expect(formatPesos(1_750_000).replace(/\s/g, " ")).toBe("$ 17.500");
    expect(formatPesos(125_050).replace(/\s/g, " ")).toBe("$ 1.250,50");
  });

  it("centsToInput da el texto para editar el precio", () => {
    expect(centsToInput(1_750_000)).toBe("17.500");
    expect(centsToInput(125_050)).toBe("1.250,50");
    expect(parsePesos(centsToInput(125_050))).toBe(125_050); // ida y vuelta
  });
});
