import { requerirPagina } from "@/lib/auth";
import { NavTecnico } from "@/components/tecnico/nav-tecnico";

export const dynamic = "force-dynamic";

export default async function TecnicoLayout({ children }: { children: React.ReactNode }) {
  const u = await requerirPagina("TECNICO");
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <div className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">{children}</div>
      <NavTecnico nombre={u.nombre} color={u.color} />
    </div>
  );
}
