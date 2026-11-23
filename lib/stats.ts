// Las ventas por día del dashboard: la serie completa de los últimos N días,
// con 0 en los días sin ventas (MongoDB solo devuelve los días que tuvieron).

export const TIME_ZONE = "America/Argentina/Buenos_Aires";

export interface DayTotal {
  day: string; // AAAA-MM-DD, en hora de Buenos Aires
  total: number; // centavos
  orders: number;
}

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** La fecha en hora argentina como AAAA-MM-DD (en-CA ya usa ese orden). */
export function localDay(date: Date): string {
  return dayFormat.format(date);
}

/**
 * Los últimos `days` días hasta hoy, en orden, rellenando con 0. Se cuenta
 * en días de calendario argentinos: una venta a las 23:30 del lunes es del
 * lunes, aunque en UTC ya sea martes.
 */
export function fillDays(rows: DayTotal[], now: Date, days: number): DayTotal[] {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const series: DayTotal[] = [];
  for (let i = days - 1; i >= 0; i--) {
    // Argentina no cambia de hora en verano: restar 24 h es restar un día.
    const day = localDay(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
    series.push(byDay.get(day) ?? { day, total: 0, orders: 0 });
  }
  return series;
}

/** "2026-11-05" → "5/11", para el eje del gráfico. */
export function shortDay(day: string): string {
  const [, month, date] = day.split("-");
  return `${Number(date)}/${Number(month)}`;
}
