import type { Metadata } from "next";
import Link from "next/link";
import { button, buttonSecondary, pageShell } from "@/components/ui";

export const metadata: Metadata = { title: "Pago cancelado" };

export default function CheckoutCancelledPage() {
  return (
    <main className={`${pageShell} max-w-xl`}>
      <h1 className="display text-3xl">No se hizo el pago</h1>
      <p className="mt-3 text-muted">
        Volviste de Stripe sin pagar, así que no se cobró nada. Tu carrito sigue igual: podés revisarlo y pagar
        cuando quieras.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/carrito" className={button}>Volver al carrito</Link>
        <Link href="/" className={buttonSecondary}>Seguir mirando</Link>
      </div>
    </main>
  );
}
