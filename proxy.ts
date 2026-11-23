import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/jwt";

// proxy.ts es el sustituto de middleware.ts en Next.js 16. Se ejecuta antes
// de cada petición a las páginas protegidas y decide por el rol que lleva el
// JWT de la cookie (firmado: el navegador no puede cambiarlo). No toca
// MongoDB, para que sea rápido. Las rutas de la API lo comprueban otra vez
// por su cuenta (lib/api.ts).
//
//   /admin/…                       solo admin
//   /carrito, /pedidos, /checkout  solo clientes
//   /login, /registro              sin sesión (con sesión, a su inicio)
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const jwt = request.cookies.get("session")?.value;
  const session = jwt ? await verifySession(jwt) : null;
  const home = session?.role === "admin" ? "/admin" : "/";

  const redirect = (to: string) => {
    const response = NextResponse.redirect(new URL(to, request.url));
    if (jwt && !session) response.cookies.delete("session"); // caducada o alterada
    return response;
  };

  if (pathname === "/login" || pathname === "/registro") {
    return session ? redirect(home) : NextResponse.next();
  }

  const needs = pathname.startsWith("/admin") ? "admin" : "customer";
  if (!session) {
    return redirect(`/login?next=${encodeURIComponent(pathname + search)}`);
  }
  // Con sesión pero el rol equivocado: a su propio inicio, sin error.
  if (session.role !== needs) return redirect(home);
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/carrito", "/pedidos/:path*", "/checkout/:path*", "/login", "/registro"],
};
