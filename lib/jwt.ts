import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./types";

// JWT de sesión, firmado con HS256 y AUTH_SECRET. Sin dependencias de base de
// datos: lo importa proxy.ts, que se ejecuta antes de cada petición.
//
// El rol va dentro del JWT para que proxy.ts pueda decidir sin consultar
// MongoDB. Como está firmado, el navegador no puede cambiarlo: si alguien
// edita el payload, la firma deja de valer.

export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface SessionPayload {
  sub: string; // id del usuario
  email: string;
  name: string;
  role: Role;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('Falta la variable de entorno "AUTH_SECRET"');
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

/** El payload si la firma y la caducidad son válidas; null si no. */
export async function verifySession(jwt: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(jwt, getSecret(), { algorithms: ["HS256"] });
    const { sub, email, name, role } = payload;
    if (typeof sub !== "string" || typeof email !== "string" || typeof name !== "string") return null;
    if (role !== "admin" && role !== "customer") return null;
    return { sub, email, name, role };
  } catch {
    return null;
  }
}
