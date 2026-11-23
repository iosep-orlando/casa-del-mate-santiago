import { describe, expect, it } from "vitest";
import { fillDays, localDay, shortDay } from "@/lib/stats";

describe("ventas por día", () => {
  it("el día es el de Buenos Aires, no el de UTC", () => {
    // 02:30 UTC del 23 = 23:30 del 22 en Argentina.
    expect(localDay(new Date("2026-11-23T02:30:00Z"))).toBe("2026-11-22");
    expect(localDay(new Date("2026-11-23T03:30:00Z"))).toBe("2026-11-23");
  });

  it("completa los días sin ventas con 0, en orden, terminando hoy", () => {
    const now = new Date("2026-11-22T15:00:00Z");
    const series = fillDays([{ day: "2026-11-21", total: 500, orders: 1 }], now, 3);
    expect(series).toEqual([
      { day: "2026-11-20", total: 0, orders: 0 },
      { day: "2026-11-21", total: 500, orders: 1 },
      { day: "2026-11-22", total: 0, orders: 0 },
    ]);
    expect(fillDays([], now, 30)).toHaveLength(30);
  });

  it("shortDay", () => {
    expect(shortDay("2026-11-05")).toBe("5/11");
  });
});
