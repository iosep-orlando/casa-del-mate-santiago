import type { ObjectId } from "mongodb";
import { collections, toObjectId } from "./db";
import { getSession } from "./session";
import type { SessionPayload } from "./jwt";

// Respuestas de error con la misma forma en toda la API: { error: "…" }.
export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/** El cuerpo JSON de la petición, o null si no es un objeto JSON válido. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export interface Caller extends SessionPayload {
  userId: ObjectId;
}

/**
 * proxy.ts ya protege las páginas, pero cada ruta de la API lo vuelve a
 * comprobar: una ruta se puede llamar directamente, sin pasar por la página.
 */
export async function requireCustomer(): Promise<Caller | Response> {
  const session = await getSession();
  const userId = session && toObjectId(session.sub);
  if (!session || !userId) return jsonError(401, "Tenés que iniciar sesión.");
  if (session.role !== "customer") return jsonError(403, "Esta acción es para clientes.");
  return { ...session, userId };
}

/**
 * Para el admin, además del JWT, se confirma el rol en la base: si se le
 * quita el rol a alguien, deja de poder actuar como admin al momento, sin
 * esperar a que caduque su sesión (7 días).
 */
export async function requireAdmin(): Promise<Caller | Response> {
  const session = await getSession();
  const userId = session && toObjectId(session.sub);
  if (!session || !userId) return jsonError(401, "Tenés que iniciar sesión.");
  if (session.role !== "admin") return jsonError(403, "Solo para administradores.");
  const { users } = await collections();
  const user = await users.findOne({ _id: userId }, { projection: { role: 1 } });
  if (user?.role !== "admin") return jsonError(403, "Solo para administradores.");
  return { ...session, userId };
}

/**
 * El dominio de la tienda, para las URL de vuelta de Stripe. Detrás de un
 * proxy, el Host de la petición puede no ser el público, así que primero
 * APP_URL si está, luego RENDER_EXTERNAL_URL (Render la pone sola) y, si no,
 * el de la propia petición (en local, http://localhost:3000).
 */
export function appOrigin(request: Request): string {
  const configured = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL)?.replace(/\/+$/, "");
  return configured || new URL(request.url).origin;
}
