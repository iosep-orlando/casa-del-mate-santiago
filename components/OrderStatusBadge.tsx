import { STATUS_LABEL } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";

const STYLE: Record<OrderStatus, string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-900",
  paid: "border-hoja/50 bg-hoja/10 text-yerba-dark",
  shipped: "border-yerba bg-yerba text-white",
  cancelled: "border-line bg-paper text-muted",
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
