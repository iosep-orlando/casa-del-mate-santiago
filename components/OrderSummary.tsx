import { formatDateTime, orderNumber } from "@/lib/format";
import { formatPesos } from "@/lib/money";
import type { OrderDTO } from "@/lib/types";
import OrderStatusBadge from "./OrderStatusBadge";
import { panel } from "./ui";

/** Un pedido: número, fecha, estado, líneas y total. `children`, para acciones del admin. */
export default function OrderSummary({
  order,
  showCustomer = false,
  children,
}: {
  order: OrderDTO;
  showCustomer?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <article className={`${panel} p-4 sm:p-5`}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="tabular font-bold">Pedido {orderNumber(order.id)}</h2>
        <OrderStatusBadge status={order.status} />
        <span className="text-sm text-muted">{formatDateTime(order.createdAt)}</span>
      </header>
      {showCustomer && (
        <p className="mt-1 text-sm">
          {order.customerName} <span className="text-muted">· {order.customerEmail}</span>
        </p>
      )}
      <ul className="mt-3 space-y-1 text-sm">
        {order.items.map((item) => (
          <li key={item.productId} className="flex justify-between gap-4">
            <span>
              {item.quantity} × {item.name}
            </span>
            <span className="tabular">{formatPesos(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
        <span className="font-semibold">Total</span>
        <span className="tabular text-lg font-bold">{formatPesos(order.total)}</span>
      </div>
      {order.status === "pending" && (
        <p className="mt-2 text-sm text-muted">Si no se paga, se cancela solo a los 30 minutos.</p>
      )}
      {order.cancelReason && <p className="mt-2 text-sm text-muted">{order.cancelReason}</p>}
      {order.refunded && <p className="mt-1 text-sm text-muted">El dinero se devolvió por Stripe.</p>}
      {children}
    </article>
  );
}
