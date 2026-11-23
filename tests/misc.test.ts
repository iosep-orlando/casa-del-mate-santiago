import { describe, expect, it } from "vitest";
import { readCatalogParams } from "@/lib/catalog";
import { formatDate, formatDateTime, orderNumber } from "@/lib/format";
import { databaseName } from "@/lib/mongodb";

describe("readCatalogParams", () => {
  it("toma el primer valor, recorta y limita", () => {
    expect(readCatalogParams({ q: " mate ", categoria: ["Mates", "Yerbas"] })).toEqual({ q: "mate", category: "Mates" });
    expect(readCatalogParams({})).toEqual({ q: "", category: "" });
    expect(readCatalogParams({ q: "x".repeat(300) }).q).toHaveLength(100);
  });
});

describe("formato", () => {
  it("fechas en hora argentina y número de pedido corto", () => {
    expect(formatDateTime("2026-11-23T02:30:00Z")).toBe("22 de nov de 2026, 23:30");
    expect(formatDate("2026-11-23T02:30:00Z")).toBe("22 de nov de 2026");
    expect(orderNumber("6740f1a2b3c4d5e6f7a8b9c0")).toBe("#A8B9C0");
  });
});

describe("databaseName", () => {
  it("MONGODB_DB, luego la URI, luego 'ecommerce'", () => {
    expect(databaseName("mongodb://localhost:27017", undefined)).toBe("ecommerce");
    expect(databaseName("mongodb://localhost:27017/tienda?x=1", undefined)).toBe("tienda");
    expect(databaseName("mongodb+srv://u:p@c.mongodb.net/tienda", "otra")).toBe("otra");
  });
});
