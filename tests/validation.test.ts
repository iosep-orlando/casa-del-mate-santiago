import { describe, expect, it } from "vitest";
import {
  normalizeImageUrl,
  validateLogin,
  validateProduct,
  validateQuantity,
  validateRegistration,
} from "@/lib/validation";

const product = {
  name: " Mate de algarrobo ",
  description: "Torneado",
  price: "14.900",
  stock: "8",
  category: "Mates",
  imageUrl: "",
  active: true,
};

describe("validateProduct", () => {
  it("normaliza un producto válido", () => {
    const result = validateProduct(product);
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Mate de algarrobo",
        description: "Torneado",
        price: 1_490_000,
        stock: 8,
        category: "Mates",
        imageUrl: null,
        active: true,
      },
    });
  });

  it.each([
    [{ name: "" }, "nombre"],
    [{ name: "x".repeat(121) }, "120"],
    [{ category: "" }, "categoría"],
    [{ price: "12.5" }, "precio"],
    [{ price: 1000 }, "precio"], // número en vez de texto
    [{ stock: "-1" }, "stock"],
    [{ stock: "2.5" }, "stock"],
    [{ stock: "100001" }, "stock"],
    [{ description: "x".repeat(2001) }, "2000"],
    [{ imageUrl: "http://inseguro.com/a.jpg" }, "https://"],
  ])("rechaza %j", (patch, message) => {
    const result = validateProduct({ ...product, ...patch });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });

  it("active: checkbox 'on', booleano, o true si no viene", () => {
    const pick = (active: unknown) => {
      const result = validateProduct({ ...product, active });
      return result.ok && result.value.active;
    };
    expect(pick("on")).toBe(true);
    expect(pick(false)).toBe(false);
    expect(pick(undefined)).toBe(true);
  });
});

describe("normalizeImageUrl", () => {
  it("acepta https y rutas de la tienda; rechaza el resto", () => {
    expect(normalizeImageUrl("https://ejemplo.com/a.jpg")).toEqual({ ok: true, value: "https://ejemplo.com/a.jpg" });
    expect(normalizeImageUrl("/productos/mate.svg")).toEqual({ ok: true, value: "/productos/mate.svg" });
    expect(normalizeImageUrl("  ")).toEqual({ ok: true, value: null });
    expect(normalizeImageUrl("//otro.com/a.jpg").ok).toBe(false); // protocolo relativo
    expect(normalizeImageUrl("javascript:alert(1)").ok).toBe(false);
    expect(normalizeImageUrl("data:image/png;base64,xx").ok).toBe(false);
    expect(normalizeImageUrl(`https://a.com/${"x".repeat(500)}`).ok).toBe(false);
  });
});

describe("registro y login", () => {
  it("normaliza el email y exige contraseña de 8 a 72 bytes", () => {
    expect(validateRegistration({ name: "Ana", email: " ANA@Mail.com ", password: "12345678" })).toEqual({
      ok: true,
      value: { name: "Ana", email: "ana@mail.com", password: "12345678" },
    });
    expect(validateRegistration({ name: "Ana", email: "ana@mail.com", password: "1234567" }).ok).toBe(false);
    expect(validateRegistration({ name: "Ana", email: "ana@mail.com", password: "ñ".repeat(37) }).ok).toBe(false); // 74 bytes
    expect(validateRegistration({ name: "", email: "ana@mail.com", password: "12345678" }).ok).toBe(false);
    expect(validateRegistration({ name: "x".repeat(81), email: "ana@mail.com", password: "12345678" }).ok).toBe(false);
    expect(validateRegistration({ name: "Ana", email: "no-es-email", password: "12345678" }).ok).toBe(false);
  });

  it("el login solo exige que vengan los dos campos", () => {
    expect(validateLogin({ email: "A@b.com", password: "x" })).toEqual({ ok: true, value: { email: "a@b.com", password: "x" } });
    expect(validateLogin({ email: "a@b.com" }).ok).toBe(false);
  });
});

describe("validateQuantity", () => {
  it("entero de 1 a 99", () => {
    expect(validateQuantity(1)).toEqual({ ok: true, value: 1 });
    expect(validateQuantity(99)).toEqual({ ok: true, value: 99 });
    for (const bad of [0, 100, 1.5, "2", null]) expect(validateQuantity(bad).ok).toBe(false);
  });
});
