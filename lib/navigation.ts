import type { Role } from "./types";

/**
 * Adónde ir después de entrar. Solo rutas internas: ?next=https://otro-sitio
 * no puede sacar al usuario fuera de la tienda. Sin next, el admin va a su
 * panel y el cliente al catálogo.
 */
export function afterLogin(next: string | null, role: Role): string {
  const fallback = role === "admin" ? "/admin" : "/";
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  // Un cliente no tiene nada que hacer en /admin (ni el admin en el carrito):
  // proxy.ts lo rebotaría igual, mejor no mandarlo.
  const isAdminPath = next === "/admin" || next.startsWith("/admin/");
  return isAdminPath === (role === "admin") ? next : fallback;
}
