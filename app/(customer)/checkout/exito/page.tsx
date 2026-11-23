import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutResult from "@/components/CheckoutResult";
import { pageShell } from "@/components/ui";

export const metadata: Metadata = { title: "Pago" };

export default function CheckoutSuccessPage() {
  return (
    <main className={pageShell}>
      {/* useSearchParams (session_id) necesita un Suspense alrededor. */}
      <Suspense fallback={<p className="text-muted">Comprobando el pago…</p>}>
        <CheckoutResult />
      </Suspense>
    </main>
  );
}
