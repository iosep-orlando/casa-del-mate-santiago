import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signSession, verifySession, type SessionPayload } from "@/lib/jwt";
import { afterLogin } from "@/lib/navigation";
import { proxy } from "@/proxy";

const customer: SessionPayload = { sub: "u1", email: "ana@mail.com", name: "Ana", role: "customer" };
const admin: SessionPayload = { ...customer, sub: "u2", role: "admin" };

describe("JWT de sesión", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("ida y vuelta con el rol", async () => {
    expect(await verifySession(await signSession(customer))).toEqual(customer);
  });

  it("un rol cambiado a mano invalida la firma", async () => {
    const [header, payload, signature] = (await signSession(customer)).split(".");
    const forged = JSON.parse(Buffer.from(payload, "base64url").toString());
    forged.role = "admin";
    const tampered = [header, Buffer.from(JSON.stringify(forged)).toString("base64url"), signature].join(".");
    expect(await verifySession(tampered)).toBeNull();
  });

  it("rechaza basura, roles desconocidos y otro secreto", async () => {
    expect(await verifySession("no.es.jwt")).toBeNull();
    const secret = new TextEncoder().encode("secreto-solo-para-tests");
    const weird = await new SignJWT({ email: "a@b.com", name: "A", role: "root" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .sign(secret);
    expect(await verifySession(weird)).toBeNull();

    const jwt = await signSession(customer);
    vi.stubEnv("AUTH_SECRET", "otro-secreto");
    expect(await verifySession(jwt)).toBeNull();
  });

  it("sin AUTH_SECRET falla con un mensaje claro", async () => {
    vi.stubEnv("AUTH_SECRET", "");
    await expect(signSession(customer)).rejects.toThrow("AUTH_SECRET");
  });
});

describe("afterLogin", () => {
  it("cada rol a su inicio, y next solo si es interno y de su rol", () => {
    expect(afterLogin(null, "customer")).toBe("/");
    expect(afterLogin(null, "admin")).toBe("/admin");
    expect(afterLogin("/carrito", "customer")).toBe("/carrito");
    expect(afterLogin("/admin/pedidos", "admin")).toBe("/admin/pedidos");
    expect(afterLogin("/admin", "customer")).toBe("/");
    expect(afterLogin("/carrito", "admin")).toBe("/admin");
    expect(afterLogin("https://malo.com", "customer")).toBe("/");
    expect(afterLogin("//malo.com", "customer")).toBe("/");
    expect(afterLogin("/\\malo.com", "customer")).toBe("/");
  });
});

describe("proxy.ts", () => {
  async function visit(path: string, session?: SessionPayload | string) {
    const request = new NextRequest(new URL(path, "http://localhost:3000"));
    if (session) {
      request.cookies.set("session", typeof session === "string" ? session : await signSession(session));
    }
    const response = await proxy(request);
    const location = response.headers.get("location");
    return location ? new URL(location).pathname + new URL(location).search : null;
  }

  it("sin sesión, al login recordando adónde iba", async () => {
    expect(await visit("/carrito")).toBe("/login?next=%2Fcarrito");
    expect(await visit("/admin/pedidos?estado=paid")).toBe("/login?next=%2Fadmin%2Fpedidos%3Festado%3Dpaid");
  });

  it("cada rol pasa solo a lo suyo", async () => {
    expect(await visit("/carrito", customer)).toBeNull();
    expect(await visit("/admin", admin)).toBeNull();
    expect(await visit("/admin/productos", customer)).toBe("/");
    expect(await visit("/carrito", admin)).toBe("/admin");
  });

  it("con sesión, login y registro llevan al inicio", async () => {
    expect(await visit("/login")).toBeNull();
    expect(await visit("/registro", customer)).toBe("/");
    expect(await visit("/login", admin)).toBe("/admin");
  });

  it("una cookie inválida se borra", async () => {
    const request = new NextRequest(new URL("/pedidos", "http://localhost:3000"));
    request.cookies.set("session", "basura");
    const response = await proxy(request);
    expect(response.headers.get("set-cookie")).toMatch(/session=;/);
  });
});
