"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/clientes", label: "Clientes" },
];

/** Con la ruta actual resaltada. usePathname depende de la URL: va en Suspense. */
export default function AdminNav() {
  return <AdminNavLinks pathname={usePathname()} />;
}

/** Mientras tanto (y en el prerender), los mismos enlaces sin resaltar. */
export function AdminNavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Panel de administración" className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map(({ href, label }) => {
        const active = pathname !== null && (href === "/admin" ? pathname === href : pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${
              active ? "bg-yerba text-white" : "hover:bg-calabaza"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
