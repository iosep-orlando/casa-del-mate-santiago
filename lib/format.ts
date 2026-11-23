import { TIME_ZONE } from "./stats";

const dateTime = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23", // 23:30, no "11:30 p. m."
});

const dateOnly = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "22 de nov de 2026, 21:05", siempre en hora argentina (el servidor puede estar en UTC). */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return dateOnly.format(new Date(iso));
}

/** Los últimos 6 caracteres del id, para nombrar el pedido: "#a1b2c3". */
export function orderNumber(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}
