import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { listarPartes, type FiltrosPartes } from "@/lib/admin-partes";
import { tecnicosActivos } from "@/lib/admin";
import { ESTADO_PARTE } from "@/lib/ui-estado";
import { ESTADOS_PARTE } from "@/lib/validations";
import { TablaPartes } from "@/components/admin/tabla-partes";
import { selectClase } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "Partes" };

const POR_PAGINA = 50;

export default async function PartesPage({ searchParams }: { searchParams: Promise<FiltrosPartes & { pagina?: string }> }) {
  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const [{ total, partes }, tecnicos] = await Promise.all([listarPartes(sp, pagina, POR_PAGINA), tecnicosActivos()]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlace = (p: number) => {
    const q = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "pagina") as [string, string][]);
    q.set("pagina", String(p));
    return `/admin/partes?${q}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Partes</h1>
        <Button asChild>
          <Link href="/admin/partes/nuevo">
            <Plus className="size-4" /> Nuevo parte
          </Link>
        </Button>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="grid min-w-64 flex-1 gap-1.5">
          <Label htmlFor="q">Buscar</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input id="q" name="q" defaultValue={sp.q} placeholder="Nº parte, pedido, cliente, código, población…" className="pl-8" />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="estado">Estado</Label>
          <select id="estado" name="estado" defaultValue={sp.estado ?? ""} className={`${selectClase} w-36`}>
            <option value="">Todos</option>
            {ESTADOS_PARTE.map((e) => (
              <option key={e} value={e}>
                {ESTADO_PARTE[e].label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="tecnicoId">Técnico</Label>
          <select id="tecnicoId" name="tecnicoId" defaultValue={sp.tecnicoId ?? ""} className={`${selectClase} w-40`}>
            <option value="">Todos</option>
            <option value="sin">Sin asignar</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="desde">Desde</Label>
          <Input id="desde" name="desde" type="date" defaultValue={sp.desde} className="w-40" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="hasta">Hasta</Label>
          <Input id="hasta" name="hasta" type="date" defaultValue={sp.hasta} className="w-40" />
        </div>
        <label className="flex h-9 items-center gap-2 text-sm font-medium text-red-700">
          <input type="checkbox" name="atencion" value="1" defaultChecked={sp.atencion === "1"} className="size-4 accent-red-600" />
          Solo ATENCIÓN
        </label>
        <Button type="submit">Filtrar</Button>
        <Button asChild variant="ghost">
          <Link href="/admin/partes">Limpiar</Link>
        </Button>
      </form>

      <TablaPartes partes={partes} tecnicos={tecnicos} seleccionable />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} {total === 1 ? "parte" : "partes"}
        </span>
        {paginas > 1 && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className={pagina <= 1 ? "pointer-events-none opacity-50" : ""}>
              <Link href={enlace(pagina - 1)}>Anterior</Link>
            </Button>
            <span>
              Página {pagina} de {paginas}
            </span>
            <Button asChild variant="outline" size="sm" className={pagina >= paginas ? "pointer-events-none opacity-50" : ""}>
              <Link href={enlace(pagina + 1)}>Siguiente</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
