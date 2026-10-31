import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { contiene, prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string; inactivos?: string }> }) {
  const { q = "", inactivos } = await searchParams;
  const t = q.trim();
  const clientes = await prisma.cliente.findMany({
    where: {
      ...(!inactivos && { activo: true }),
      ...(t && {
        OR: [{ nombre: contiene(t) }, { codigo: contiene(t) }, { poblacion: contiene(t) }, { contacto: contiene(t) }],
      }),
    },
    orderBy: [{ codigo: "asc" }, { nombre: "asc" }],
    take: 500,
    include: { _count: { select: { partes: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <Button asChild>
          <Link href="/admin/clientes/nuevo">
            <Plus className="size-4" /> Nuevo cliente
          </Link>
        </Button>
      </div>
      <form className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Buscar por nombre, código, población…" className="pl-8" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="inactivos" value="1" defaultChecked={!!inactivos} className="size-4" />
          Incluir inactivos
        </label>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Población</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-right">Partes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((c) => (
              <TableRow key={c.id} className={c.activo ? "" : "opacity-50"}>
                <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
                <TableCell>
                  <Link href={`/admin/clientes/${c.id}`} className="font-medium hover:underline">
                    {c.nombre}
                  </Link>
                  {!c.activo && <span className="ml-2 text-xs text-muted-foreground">(inactivo)</span>}
                </TableCell>
                <TableCell>{c.poblacion}</TableCell>
                <TableCell className="text-muted-foreground">{c.contacto}</TableCell>
                <TableCell className="text-muted-foreground">{c.telefono}</TableCell>
                <TableCell className="text-right tabular-nums">{c._count.partes}</TableCell>
              </TableRow>
            ))}
            {clientes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No hay clientes{t && " que coincidan"}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
