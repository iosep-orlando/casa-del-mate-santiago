import type { Metadata } from "next";
import { Suspense } from "react";
import CartView from "@/components/CartView";
import { pageShell, pageTitle } from "@/components/ui";
import { toObjectId } from "@/lib/db";
import { getSession } from "@/lib/session";
import { loadCart } from "@/lib/store/cart";

export const metadata: Metadata = { title: "Carrito" };

export default function CartPage() {
  return (
    <main className={pageShell}>
      <h1 className={pageTitle}>Tu carrito</h1>
      <Suspense fallback={<p className="mt-6 text-muted">Cargando el carrito…</p>}>
        <CartLoader />
      </Suspense>
    </main>
  );
}

async function CartLoader() {
  // proxy.ts ya dejó pasar solo a clientes con sesión.
  const session = await getSession();
  const customerId = session && toObjectId(session.sub);
  if (!customerId) return null;
  return <CartView initial={await loadCart(customerId)} />;
}
