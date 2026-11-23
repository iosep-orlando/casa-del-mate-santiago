"use client";

import { useState } from "react";
import { formatPesos } from "@/lib/money";
import { shortDay, type DayTotal } from "@/lib/stats";

// Ventas por día: barras de un solo color (una sola serie: no hace falta
// leyenda, el título la nombra). Cada barra muestra su valor al pasar el
// mouse o con el teclado, y la tabla de abajo tiene todos los números sin
// depender del gráfico.

const BAR = "#5f8a2c"; // verde hoja, validado (luminosidad, croma y contraste)
const W = 720;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 64 };

/** Un tope "redondo" para el eje: 37.400 → 40.000. */
function niceMax(value: number): number {
  if (value <= 0) return 100_00; // sin ventas: un eje de $ 100 para que se dibuje
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

export default function SalesChart({ data }: { data: DayTotal[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.total)));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / data.length;
  const barW = Math.max(slot - 2, 2); // 2px de aire entre barras
  const y = (value: number) => PAD.top + plotH - (value / max) * plotH;
  const ticks = [0, max / 2, max];
  const hovered = active !== null ? data[active] : null;

  return (
    <figure>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Ventas por día, últimos 30 días">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="#dfe3d4" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular">
                {formatPesos(tick)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = PAD.left + i * slot + (slot - barW) / 2;
            const h = Math.max(y(0) - y(d.total), d.total > 0 ? 2 : 0);
            const r = Math.min(4, barW / 2, h);
            return (
              <g
                key={d.day}
                tabIndex={0}
                role="button"
                aria-label={`${shortDay(d.day)}: ${formatPesos(d.total)}, ${d.orders} pedidos`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="cursor-default outline-none"
              >
                {/* El área de la columna entera responde, no solo la barra. */}
                <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH} fill="transparent" />
                {h > 0 && (
                  <path
                    // Esquinas redondeadas solo arriba; la base queda recta sobre el eje.
                    d={`M${x},${y(0)} V${y(0) - h + r} Q${x},${y(0) - h} ${x + r},${y(0) - h} H${x + barW - r} Q${x + barW},${y(0) - h} ${x + barW},${y(0) - h + r} V${y(0)} Z`}
                    fill={BAR}
                    opacity={active === null || active === i ? 1 : 0.55}
                  />
                )}
                {active === i && (
                  <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH} fill="none" stroke="#1d231b" strokeWidth={1} strokeDasharray="3 3" />
                )}
              </g>
            );
          })}
          <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke="#5d6657" strokeWidth={1} />
          {data.map((d, i) =>
            i % 5 === (data.length - 1) % 5 ? (
              <text key={d.day} x={PAD.left + i * slot + slot / 2} y={H - 8} textAnchor="middle" className="fill-muted text-[11px] tabular">
                {shortDay(d.day)}
              </text>
            ) : null,
          )}
        </svg>
        {hovered && active !== null && (
          <div
            className="pointer-events-none absolute top-0 rounded-md border border-line bg-white px-3 py-2 text-sm shadow-sm"
            style={{
              left: `${((PAD.left + active * slot + slot / 2) / W) * 100}%`,
              transform: active > data.length / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
            }}
          >
            <p className="tabular font-bold">{formatPesos(hovered.total)}</p>
            <p className="text-muted">
              {shortDay(hovered.day)} · {hovered.orders === 1 ? "1 pedido" : `${hovered.orders} pedidos`}
            </p>
          </div>
        )}
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-semibold text-muted hover:text-ink">Ver como tabla</summary>
        <table className="mt-2 w-full max-w-md text-left">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-1 font-semibold">Día</th>
              <th className="py-1 text-right font-semibold">Pedidos</th>
              <th className="py-1 text-right font-semibold">Ventas</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {data.filter((d) => d.orders > 0).map((d) => (
              <tr key={d.day} className="border-b border-line/60">
                <td className="py-1">{shortDay(d.day)}</td>
                <td className="py-1 text-right">{d.orders}</td>
                <td className="py-1 text-right">{formatPesos(d.total)}</td>
              </tr>
            ))}
            {data.every((d) => d.orders === 0) && (
              <tr>
                <td colSpan={3} className="py-2 text-muted">Sin ventas en estos 30 días.</td>
              </tr>
            )}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
