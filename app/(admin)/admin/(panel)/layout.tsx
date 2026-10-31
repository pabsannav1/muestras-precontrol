import Link from "next/link";
import { Droplets } from "lucide-react";
import { requerirPagina } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { NavAdmin } from "@/components/admin/nav-admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requerirPagina("ADMIN");
  return (
    <div className="min-h-dvh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-6">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <Droplets className="size-5 text-cyan-700" />
            Toma de Muestras
          </Link>
          <NavAdmin />
          <span className="ml-auto text-sm text-muted-foreground">{u.nombre}</span>
          <LogoutButton destino="/admin/login" className="text-sm text-muted-foreground hover:text-foreground" />
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
