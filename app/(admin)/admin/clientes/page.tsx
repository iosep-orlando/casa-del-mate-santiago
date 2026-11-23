import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { panel, pageTitle } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { formatPesos } from "@/lib/money";
import { listCustomers } from "@/lib/store/admin";

export const metadata: Metadata = { title: "Clientes" };

export default function CustomersPage() {
  return (
    <main>
      <h1 className={pageTitle}>Clientes</h1>
      <Suspense fallback={<p className="mt-6 text-muted">Cargando…</p>}>
        <CustomersTable />
      </Suspense>
    </main>
  );
}

async function CustomersTable() {
  // Datos de MongoDB en cada petición, nunca prerenderizados al compilar.
  await connection();
  const customers = await listCustomers();
  if (customers.length === 0) return <p className="mt-6 text-muted">Todavía no se registró ningún cliente.</p>;
  return (
    <div className={`${panel} mt-6 overflow-x-auto`}>
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead className="border-b border-line text-muted">
          <tr>
            <th className="p-3 font-semibold">Cliente</th>
            <th className="p-3 font-semibold">Desde</th>
            <th className="p-3 text-right font-semibold">Pedidos pagados</th>
            <th className="p-3 text-right font-semibold">Gastó</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td className="p-3">
                <p className="font-semibold">{customer.name}</p>
                <p className="text-muted">{customer.email}</p>
              </td>
              <td className="p-3">{formatDate(customer.createdAt)}</td>
              <td className="tabular p-3 text-right">{customer.orders}</td>
              <td className="tabular p-3 text-right">{formatPesos(customer.spent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
