"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    // A la portada y releer la cabecera: ya sin sesión.
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="rounded-md px-2 py-1 font-semibold text-muted hover:bg-calabaza hover:text-ink disabled:opacity-60"
    >
      Salir
    </button>
  );
}
