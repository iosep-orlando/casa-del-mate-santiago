import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function Page() {
  return (
    <main className="px-4 pb-12">
      {/* useSearchParams (para ?next=) necesita un Suspense alrededor. */}
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </main>
  );
}
