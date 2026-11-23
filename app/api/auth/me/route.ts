import { getSession } from "@/lib/session";

// Quién es el usuario de la cookie. 200 con user null si no hay sesión: no
// tener sesión no es un error para quien pregunta.
export async function GET() {
  const session = await getSession();
  return Response.json({
    user: session
      ? { id: session.sub, email: session.email, name: session.name, role: session.role }
      : null,
  });
}
