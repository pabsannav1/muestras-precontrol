import { requerirPagina } from "@/lib/auth";
import { partesHechos } from "@/lib/partes";
import { hoyKey } from "@/lib/fechas";
import { ParteCard } from "@/components/tecnico/parte-card";

export const metadata = { title: "Hechos" };

export default async function HechosPage() {
  const u = await requerirPagina("TECNICO");
  const partes = await partesHechos(u.id, hoyKey());
  return (
    <div className="mx-auto max-w-md">
      <header className="sticky top-0 z-10 border-b bg-background px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="text-lg font-semibold">Hechos</h1>
        <p className="text-sm text-muted-foreground">Partes completados de días anteriores</p>
      </header>
      <div className="grid gap-2 p-4">
        {partes.map((p) => (
          <ParteCard key={p.id} parte={p} mostrarFecha />
        ))}
        {partes.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Todavía no hay partes completados.</p>}
      </div>
    </div>
  );
}
