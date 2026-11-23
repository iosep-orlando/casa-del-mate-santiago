"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { afterLogin } from "@/lib/navigation";
import { MIN_PASSWORD } from "@/lib/validation";
import FormError from "./FormError";
import { button, input, label, panel } from "./ui";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isLogin = mode === "login";
  const next = params.get("next");
  const otherHref = (path: string) => (next ? `${path}?next=${encodeURIComponent(next)}` : path);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch(isLogin ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo completar. Probá de nuevo.");
        setPending(false);
        return;
      }
      router.push(afterLogin(next, data.user.role));
      router.refresh(); // la cabecera, ya con la sesión
    } catch {
      setError("No se pudo contactar con el servidor.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${panel} mx-auto mt-12 w-full max-w-md space-y-4 p-6`}>
      <h1 className="display text-2xl">{isLogin ? "Ingresar" : "Crear cuenta"}</h1>
      {!isLogin && (
        <div>
          <label htmlFor="name" className={label}>Nombre</label>
          <input id="name" name="name" required maxLength={80} autoComplete="name" className={input} />
        </div>
      )}
      <div>
        <label htmlFor="email" className={label}>Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={input} />
      </div>
      <div>
        <label htmlFor="password" className={label}>Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={isLogin ? undefined : MIN_PASSWORD}
          autoComplete={isLogin ? "current-password" : "new-password"}
          className={input}
        />
        {!isLogin && <p className="mt-1 text-xs text-muted">Al menos {MIN_PASSWORD} caracteres.</p>}
      </div>
      <FormError message={error} />
      <button type="submit" disabled={pending} className={`${button} w-full`}>
        {pending ? "Un momento…" : isLogin ? "Ingresar" : "Crear cuenta"}
      </button>
      <p className="text-center text-sm text-muted">
        {isLogin ? (
          <>¿No tenés cuenta? <Link href={otherHref("/registro")} className="font-semibold text-yerba hover:underline">Creala</Link></>
        ) : (
          <>¿Ya tenés cuenta? <Link href={otherHref("/login")} className="font-semibold text-yerba hover:underline">Ingresá</Link></>
        )}
      </p>
    </form>
  );
}
