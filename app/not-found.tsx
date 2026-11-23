import Link from "next/link";
import { button, pageShell } from "@/components/ui";

export default function NotFound() {
  return (
    <main className={`${pageShell} max-w-xl`}>
      <h1 className="display text-3xl">No encontramos esa página</h1>
      <p className="mt-3 text-muted">Puede que el producto ya no esté a la venta o que el enlace esté mal.</p>
      <Link href="/" className={`${button} mt-6`}>Ir al catálogo</Link>
    </main>
  );
}
