import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import SalesChart from "@/components/SalesChart";
import { panel, pageTitle } from "@/components/ui";
import { formatPesos } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/orders";
import { LOW_STOCK, SALES_DAYS, dashboardStats } from "@/lib/store/admin";

export const metadata: Metadata = { title: "Panel" };

export default function DashboardPage() {
  return (
    <main>
      <h1 className={pageTitle}>Resumen</h1>
      <Suspense fallback={<p className="mt-6 text-muted">Calculando…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  // Datos de MongoDB en cada petición, nunca prerenderizados al compilar.
  await connection();
  const stats = await dashboardStats();
  const toShip = stats.ordersByStatus.paid;

  return (
    <div className="mt-6 space-y-6">
      {/* Lo primero: lo que hay que hacer hoy. */}
      <section className={`${panel} flex flex-wrap items-center justify-between gap-3 p-5`}>
        <p className="text-lg">
          {toShip === 0 ? (
            "No hay pedidos pagados esperando el envío."
          ) : (
            <>
              <strong className="tabular">{toShip}</strong> {toShip === 1 ? "pedido pagado espera" : "pedidos pagados esperan"} el envío.
            </>
          )}
        </p>
        {toShip > 0 && (
          <Link href="/admin/pedidos?estado=paid" className="font-semibold text-yerba hover:underline">
            Ver pedidos para enviar
          </Link>
        )}
      </section>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ventas totales" value={formatPesos(stats.revenue)} note={`${stats.paidOrders} pedidos pagados`} />
        <Stat label={STATUS_LABEL.pending} value={String(stats.ordersByStatus.pending)} note="pedidos abiertos en Stripe" />
        <Stat label="Clientes" value={String(stats.customers)} note="con cuenta" />
        <Stat label="Productos a la venta" value={String(stats.activeProducts)} note={`${stats.ordersByStatus.cancelled} pedidos cancelados`} />
      </dl>

      <section className={`${panel} p-5`}>
        <h2 className="font-bold">Ventas por día, últimos {SALES_DAYS} días</h2>
        <p className="text-sm text-muted">Por fecha de pago, en hora argentina. Sin cancelados.</p>
        <div className="mt-4">
          <SalesChart data={stats.sales} />
        </div>
      </section>

      <section className={`${panel} p-5`}>
        <h2 className="font-bold">Poco stock</h2>
        {stats.lowStock.length === 0 ? (
          <p className="mt-2 text-muted">Ningún producto a la venta tiene {LOW_STOCK} unidades o menos.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {stats.lowStock.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/admin/productos/${product.id}`} className="font-semibold hover:underline">{product.name}</Link>
                <span className={`tabular text-sm font-semibold ${product.stock === 0 ? "text-danger" : ""}`}>
                  {product.stock === 0 ? "Sin stock" : `${product.stock} u.`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className={`${panel} p-4`}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="tabular mt-1 text-2xl font-bold">{value}</dd>
      <dd className="mt-1 text-xs text-muted">{note}</dd>
    </div>
  );
}
