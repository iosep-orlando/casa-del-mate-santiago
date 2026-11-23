import { describe, expect, it } from "vitest";
import { catalogHref, searchPatterns } from "@/lib/search";

const matches = (query: string, text: string) =>
  searchPatterns(query).every((pattern) => new RegExp(pattern, "i").test(text));

describe("searchPatterns", () => {
  it("sin importar mayúsculas, tildes ni el orden de las palabras", () => {
    expect(matches("BOMBILLA alpaca", "Bombilla de alpaca pico de loro")).toBe(true);
    expect(matches("acero termo", "Termo de acero 1 litro")).toBe(true);
    expect(matches("cafe", "Café de especialidad")).toBe(true);
    expect(matches("Café", "cafe")).toBe(true);
    expect(matches("pequeno", "Mate pequeño")).toBe(true);
    expect(matches("termo vidrio", "Termo de acero")).toBe(false);
  });

  it("escapa los caracteres especiales", () => {
    expect(() => searchPatterns("(").map((p) => new RegExp(p))).not.toThrow();
    expect(matches(".*", "Yerba")).toBe(false);
    expect(matches("1/2", "Yerba 1/2 kg")).toBe(true);
  });

  it("nada que buscar y como mucho cinco palabras", () => {
    expect(searchPatterns("   ")).toEqual([]);
    expect(searchPatterns("a b c d e f g")).toHaveLength(5);
  });
});

describe("catalogHref", () => {
  it("arma la URL con los filtros", () => {
    expect(catalogHref({})).toBe("/");
    expect(catalogHref({ q: "mate" })).toBe("/?q=mate");
    expect(catalogHref({ q: "mate", categoria: "Mates & Co" })).toBe("/?q=mate&categoria=Mates+%26+Co");
  });
});
