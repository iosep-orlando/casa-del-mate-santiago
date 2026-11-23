import { parsePesos } from "./money";

// ---------------------------------------------------------------------------
// Validación de lo que llega del navegador. Todo lo que entra por la API pasa
// por aquí antes de tocar MongoDB o Stripe; los formularios validan también,
// pero solo para avisar antes: una petición se puede hacer sin el formulario.
// ---------------------------------------------------------------------------

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(error: string): Result<T> => ({ ok: false, error });

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Lo justo para cazar errores de tipeo; la prueba real sería un email de
// confirmación, que el enunciado no pide.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown): string {
  return text(value).toLowerCase();
}

export interface Credentials {
  email: string;
  password: string;
}

export function validateLogin(body: Record<string, unknown>): Result<Credentials> {
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return fail("Escribí tu email y tu contraseña.");
  return ok({ email, password });
}

export interface Registration extends Credentials {
  name: string;
}

export const MIN_PASSWORD = 8;
// bcrypt solo mira los primeros 72 bytes: con más, dos contraseñas distintas
// que empiecen igual valdrían lo mismo.
export const MAX_PASSWORD_BYTES = 72;

export function validateRegistration(body: Record<string, unknown>): Result<Registration> {
  const name = text(body.name);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!name) return fail("Escribí tu nombre.");
  if (name.length > 80) return fail("El nombre puede tener hasta 80 caracteres.");
  if (!EMAIL_RE.test(email) || email.length > 254) return fail("Ese email no parece válido.");
  if (password.length < MIN_PASSWORD) {
    return fail(`La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`);
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return fail("La contraseña es demasiado larga (hasta 72 caracteres).");
  }
  return ok({ name, email, password });
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string | null;
  active: boolean;
}

export const MAX_STOCK = 100_000;

/**
 * La foto es una URL: https://… de otra web, o una ruta de la propia tienda
 * (/productos/yerba.svg). Nada de http:// (el navegador la bloquearía en una
 * página https) ni de javascript: o data:.
 */
export function normalizeImageUrl(value: unknown): Result<string | null> {
  const raw = text(value);
  if (!raw) return ok(null);
  if (raw.length > 500) return fail("La URL de la imagen es demasiado larga.");
  if (raw.startsWith("/") && !raw.startsWith("//")) return ok(raw);
  try {
    const url = new URL(raw);
    if (url.protocol === "https:") return ok(url.toString());
  } catch {
    // cae al error de abajo
  }
  return fail("La imagen tiene que ser una URL que empiece con https://.");
}

export function validateProduct(body: Record<string, unknown>): Result<ProductInput> {
  const name = text(body.name);
  const description = text(body.description);
  const category = text(body.category);
  if (!name) return fail("El producto necesita un nombre.");
  if (name.length > 120) return fail("El nombre puede tener hasta 120 caracteres.");
  if (description.length > 2000) return fail("La descripción puede tener hasta 2000 caracteres.");
  if (!category) return fail("Elegí o escribí una categoría.");
  if (category.length > 40) return fail("La categoría puede tener hasta 40 caracteres.");

  // El precio llega como texto ("1.250,50"), igual que lo escribe el admin.
  const price = typeof body.price === "string" ? parsePesos(body.price) : null;
  if (price === null) return fail("El precio no es válido. Ejemplos: 12500 o 12.500,50.");

  const stock = typeof body.stock === "string" ? Number(body.stock) : body.stock;
  if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) {
    return fail(`El stock tiene que ser un número entero entre 0 y ${MAX_STOCK}.`);
  }

  const image = normalizeImageUrl(body.imageUrl);
  if (!image.ok) return image;

  const active = body.active === undefined ? true : body.active === true || body.active === "on";
  return ok({ name, description, price, stock, category, imageUrl: image.value, active });
}

export const MAX_QUANTITY = 99;

/** Unidades de un producto en el carrito: entero de 1 a 99. */
export function validateQuantity(value: unknown): Result<number> {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > MAX_QUANTITY) {
    return fail(`La cantidad tiene que ser un número entero entre 1 y ${MAX_QUANTITY}.`);
  }
  return ok(value);
}
