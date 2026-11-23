import Link from "next/link";
import { toObjectId } from "@/lib/db";
import { getSession } from "@/lib/session";
import { loadCart } from "@/lib/store/cart";
import LogoutButton from "./LogoutButton";

function Logo() {
  return (
    // El nombre en dos pisos: "La Casa del Mate" ancho y fuerte, "Santiago"
    // más chico debajo. En una sola línea, el nombre entero no entra en un
    // celular junto al menú.
    <Link href="/" aria-label="La Casa del Mate Santiago, inicio" className="flex flex-col leading-none text-yerba-dark">
      <span className="display text-lg tracking-tight sm:text-2xl">La Casa del Mate</span>
      <span className="mt-0.5 text-xs font-semibold tracking-wide text-hoja sm:text-sm">Santiago</span>
    </Link>
  );
}

const navLink = "rounded-md px-2 py-1 font-semibold hover:bg-calabaza";

/** Lo que se ve mientras se lee la sesión: la marca sola, sin saltos de altura. */
export function HeaderFallback() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
        <Logo />
      </div>
    </header>
  );
}

export default async function Header() {
  const session = await getSession();
  const customerId = session?.role === "customer" ? toObjectId(session.sub) : null;
  const cartCount = customerId ? (await loadCart(customerId)).count : 0;

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <Logo />
        <nav className="ml-auto flex flex-wrap items-center gap-1 text-sm sm:gap-2">
          {session?.role === "admin" && (
            <>
              <Link href="/admin" className={navLink}>Panel</Link>
              <Link href="/" className={navLink}>Ver la tienda</Link>
            </>
          )}
          {session?.role === "customer" && (
            <>
              <Link href="/pedidos" className={navLink}>Mis pedidos</Link>
              <Link href="/carrito" className={`${navLink} inline-flex items-center gap-1.5`}>
                Carrito
                <span
                  className="tabular min-w-6 rounded-full bg-yerba px-1.5 text-center text-xs leading-6 text-white"
                  aria-label={`${cartCount} unidades`}
                >
                  {cartCount}
                </span>
              </Link>
            </>
          )}
          {session ? (
            <>
              <span className="hidden px-2 text-muted sm:inline">{session.name}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className={navLink}>Ingresar</Link>
              <Link href="/registro" className="rounded-md bg-yerba px-3 py-1 font-semibold text-white hover:bg-yerba-dark">
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
