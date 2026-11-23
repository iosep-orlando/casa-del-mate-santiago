import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import OrderSummary from "@/components/OrderSummary";
import { button, pageShell, pageTitle } from "@/components/ui";
import { toObjectId } from "@/lib/db";
import { getSession } from "@/lib/session";
import { listCustomerOrders } from "@/lib/store/orders";

export const metadata: Metadata = { title: "Mis pedidos" };

export default function OrdersPage() {
  return (
    <main className={pageShell}>
      <h1 className={pageTitle}>Mis pedidos</h1>
      <Suspense fallback={<p className="mt-6 text-muted">Cargando tus pedidos…</p>}>
        <OrdersList />
      </Suspense>
    </main>
  );
}

async function OrdersList() {
  const session = await getSession();
  const customerId = session && toObjectId(session.sub);
  if (!customerId) return null;
  const orders = await listCustomerOrders(customerId);

  if (orders.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-dashed border-line p-10 text-center">
        <p className="font-semibold">Todavía no hiciste ningún pedido.</p>
        <Link href="/" className={`${button} mt-4`}>Ver el catálogo</Link>
      </div>
    );
  }
  return (
    <div className="mt-6 max-w-3xl space-y-4">
      {orders.map((order) => (
        <OrderSummary key={order.id} order={order} />
      ))}
    </div>
  );
}
