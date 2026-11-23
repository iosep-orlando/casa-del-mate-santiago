import { Suspense } from "react";
import AdminNav, { AdminNavLinks } from "@/components/AdminNav";

// Todo /admin comparte esta columna de navegación. proxy.ts ya dejó pasar
// solo al admin; las rutas de la API lo comprueban otra vez.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 md:grid-cols-[11rem_1fr]">
      <Suspense fallback={<AdminNavLinks pathname={null} />}>
        <AdminNav />
      </Suspense>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
