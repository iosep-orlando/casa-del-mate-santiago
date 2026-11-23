import { collections, productToDTO } from "../db";
import { TIME_ZONE, fillDays, type DayTotal } from "../stats";
import type { OrderStatus, ProductDTO } from "../types";
import { expireStalePending } from "./orders";

export const LOW_STOCK = 3;
export const SALES_DAYS = 30;

export interface DashboardStats {
  revenue: number; // pagado y enviado, sin cancelados
  paidOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  customers: number;
  activeProducts: number;
  lowStock: ProductDTO[];
  sales: DayTotal[];
}

const SOLD: OrderStatus[] = ["paid", "shipped"];

export async function dashboardStats(now = new Date()): Promise<DashboardStats> {
  await expireStalePending(now);
  const { orders, users, products } = await collections();
  const since = new Date(now.getTime() - SALES_DAYS * 24 * 60 * 60 * 1000);

  const [statusRows, salesRows, customers, activeProducts, lowStockDocs] = await Promise.all([
    orders
      .aggregate<{ _id: OrderStatus; count: number; total: number }>([
        { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$total" } } },
      ])
      .toArray(),
    orders
      .aggregate<DayTotal>([
        { $match: { status: { $in: SOLD }, paidAt: { $gte: since } } },
        {
          $group: {
            // El día en hora argentina, no en UTC.
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt", timezone: TIME_ZONE } },
            total: { $sum: "$total" },
            orders: { $sum: 1 },
          },
        },
        { $project: { _id: 0, day: "$_id", total: 1, orders: 1 } },
      ])
      .toArray(),
    users.countDocuments({ role: "customer" }),
    products.countDocuments({ active: true }),
    products.find({ active: true, stock: { $lte: LOW_STOCK } }).sort({ stock: 1, name: 1 }).toArray(),
  ]);

  const ordersByStatus: Record<OrderStatus, number> = { pending: 0, paid: 0, shipped: 0, cancelled: 0 };
  let revenue = 0;
  let paidOrders = 0;
  for (const row of statusRows) {
    ordersByStatus[row._id] = row.count;
    if (SOLD.includes(row._id)) {
      revenue += row.total;
      paidOrders += row.count;
    }
  }

  return {
    revenue,
    paidOrders,
    ordersByStatus,
    customers,
    activeProducts,
    lowStock: lowStockDocs.map(productToDTO),
    sales: fillDays(salesRows, now, SALES_DAYS),
  };
}

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  orders: number; // pagados o enviados
  spent: number;
}

/** Clientes con cuántos pedidos pagaron y cuánto gastaron, los que más compran primero. */
export async function listCustomers(): Promise<CustomerRow[]> {
  const { users } = await collections();
  const rows = await users
    .aggregate<{
      _id: import("mongodb").ObjectId;
      name: string;
      email: string;
      createdAt: Date;
      orders: number;
      spent: number;
    }>([
      { $match: { role: "customer" } },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "customerId",
          pipeline: [{ $match: { status: { $in: SOLD } } }, { $project: { total: 1 } }],
          as: "sold",
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          createdAt: 1,
          orders: { $size: "$sold" },
          spent: { $sum: "$sold.total" },
        },
      },
      { $sort: { spent: -1, createdAt: -1 } },
    ])
    .toArray();
  return rows.map((row) => ({
    id: row._id.toString(),
    name: row.name,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    orders: row.orders,
    spent: row.spent,
  }));
}
