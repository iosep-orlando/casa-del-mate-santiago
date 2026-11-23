import { describe, expect, it, vi } from "vitest";
import { detectImageType, fitWithin, uploadedImageId, uploadedImageUrl, MAX_IMAGE_BYTES } from "@/lib/images";

// La ruta de subida sin MongoDB y con el admin ya comprobado.
vi.mock("@/lib/store/images", () => ({ saveImage: vi.fn(async () => "6740f1a2b3c4d5e6f7a8b9c0") }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  requireAdmin: vi.fn(async () => ({ sub: "admin" })),
}));
const { POST } = await import("@/app/api/admin/images/route");
const { requireAdmin } = await import("@/lib/api");

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");

describe("detectImageType", () => {
  it("reconoce la foto por sus bytes, no por la etiqueta", () => {
    expect(detectImageType(PNG)).toBe("image/png");
    expect(detectImageType(JPEG)).toBe("image/jpeg");
    expect(detectImageType(WEBP)).toBe("image/webp");
    expect(detectImageType(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});

describe("fitWithin", () => {
  it("achica al lado mayor sin agrandar nunca", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1000, height: 750 });
    expect(fitWithin(1200, 4000)).toEqual({ width: 300, height: 1000 });
    expect(fitWithin(640, 480)).toEqual({ width: 640, height: 480 });
  });
});

describe("URL de las fotos subidas", () => {
  it("ida y vuelta, y solo las propias", () => {
    expect(uploadedImageId(uploadedImageUrl("6740f1a2b3c4d5e6f7a8b9c0"))).toBe("6740f1a2b3c4d5e6f7a8b9c0");
    expect(uploadedImageId("/productos/mate.svg")).toBeNull();
    expect(uploadedImageId("https://otro.com/api/images/6740f1a2b3c4d5e6f7a8b9c0")).toBeNull();
    expect(uploadedImageId(null)).toBeNull();
  });
});

describe("POST /api/admin/images", () => {
  const upload = (body: Uint8Array) =>
    POST(new Request("http://localhost/api/admin/images", { method: "POST", body: Buffer.from(body) }));

  it("guarda una foto y devuelve su URL", async () => {
    const res = await upload(WEBP);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ url: "/api/images/6740f1a2b3c4d5e6f7a8b9c0" });
  });

  it("rechaza lo que no es foto, lo vacío y lo enorme", async () => {
    expect((await upload(new TextEncoder().encode("<html>"))).status).toBe(415);
    expect((await upload(new Uint8Array())).status).toBe(400);
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
    big.set(PNG);
    expect((await upload(big)).status).toBe(413);
  });

  it("solo el admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(Response.json({ error: "x" }, { status: 403 }));
    expect((await upload(PNG)).status).toBe(403);
  });
});
