import type { Metadata } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import Header, { HeaderFallback } from "@/components/Header";
import "./globals.css";

// Una sola familia, Archivo, con ejes de anchura y peso: normal para el texto,
// ancha para los títulos. El fichero está en el repo (licencia OFL, en
// app/fonts): la compilación no depende de poder descargar de Google Fonts.
const archivo = localFont({
  src: "./fonts/archivo-variable.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "La Casa del Mate Santiago", template: "%s · La Casa del Mate Santiago" },
  description: "Yerbas, mates, bombillas y termos, con envío a todo el país.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper font-sans text-ink">
        {/* La cabecera lee la cookie de sesión: es dinámica, va en Suspense. */}
        <Suspense fallback={<HeaderFallback />}>
          <Header />
        </Suspense>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-line py-6 text-center text-sm text-muted">
          La Casa del Mate Santiago es una tienda de práctica: los pagos son de prueba con Stripe y no se cobra nada.
        </footer>
      </body>
    </html>
  );
}
