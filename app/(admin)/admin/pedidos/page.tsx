import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import OrderActions from "@/components/OrderActions";
import OrderSummary from "@/components/OrderSummary";
import { pageTitle } from "@/components/ui";
import { STATUS_LABEL, allowedAdminTransitions, isOrderStatus } from "@/lib/orders";
import { listOrders } from "@/lib/store/orders";
import type { OrderStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Pedidos" };

const FILTERS: (OrderStatus | null)[] = [null, "paid", "pending", "shipped", "cancelled"];

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/pedidos">) {
  return (
    <main>
      <h1 className={pageTitle}>Pedidos</h1>
      <Suspense fallback={<p className="mt-6 text-muted">Cargando…</p>}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Orders({ searchParams }: Pick<PageProps<"/admin/pedidos">, "searchParams">) {
  // Datos de MongoDB en cada petición (y la hora actual, para vencer los
  // pendientes viejos): nunca prerenderizados.
  await connection();
  const raw = (await searchParams).estado;
  const status = isOrderStatus(raw) ? raw : null;
  const orders = await listOrders(status ?? undefined);

  return (
    <>
      <nav aria-label="Filtrar por estado" className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter ?? "all"}
            href={filter ? `/admin/pedidos?estado=${filter}` : "/admin/pedidos"}
            aria-current={filter === status ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${
              filter === status ? "border-yerba bg-yerba text-white" : "border-line bg-white hover:border-yerba"
            }`}
          >
            {filter ? STATUS_LABEL[filter] : "Todos"}
          </Link>
        ))}
      </nav>
      {orders.length === 0 ? (
        <p className="mt-6 text-muted">No hay pedidos {status ? `en «${STATUS_LABEL[status]}»` : "todavía"}.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <OrderSummary key={order.id} order={order} showCustomer>
              <OrderActions orderId={order.id} status={order.status} options={allowedAdminTransitions(order.status)} />
            </OrderSummary>
          ))}
        </div>
      )}
    </>
  );
}
