import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { selectFilaParte } from "@/lib/admin-partes";
import { addDays, dateToKey, formatoLargo, hoyKey } from "@/lib/fechas";
import { ClienteForm } from "@/components/admin/cliente-form";
import { TablaPartes } from "@/components/admin/tabla-partes";
import { PlanVisitas } from "@/components/admin/plan-visitas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Cliente" };

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) notFound();
  const partes = await prisma.parte.findMany({
    where: { clienteId: id },
    select: selectFilaParte,
    orderBy: [{ fechaPrevista: "desc" }, { numero: "desc" }],
  });

  const hoy = hoyKey();
  const fechaContrato = cliente.fechaContrato ? dateToKey(cliente.fechaContrato) : null;
  const fechaRenovacion = cliente.fechaRenovacion ? dateToKey(cliente.fechaRenovacion) : null;
  const renovacionCerca = fechaRenovacion && fechaRenovacion <= addDays(hoy, 30);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/admin/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Clientes
        </Link>
        <h1 className="text-2xl font-semibold">
          {cliente.nombre} <span className="font-mono text-base font-normal text-muted-foreground">{cliente.codigo}</span>
        </h1>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {cliente.numeroContrato && (
            <span>
              Contrato <span className="font-mono text-foreground">{cliente.numeroContrato}</span>
            </span>
          )}
          {fechaContrato && <span>Firmado el {formatoLargo(fechaContrato)}</span>}
          {fechaRenovacion && (
            <span className={cn(renovacionCerca && "font-medium text-red-700")}>
              {fechaRenovacion < hoy ? "Renovación vencida el" : "Renovación el"} {formatoLargo(fechaRenovacion)}
            </span>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Plan de visitas</h2>
        <PlanVisitas clienteId={id} fechaContrato={fechaContrato} partes={partes} hoy={hoy} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Datos del cliente</h2>
        <div className="max-w-4xl">
          <ClienteForm
            cliente={{
              ...cliente,
              fechaContrato,
              fechaRenovacion,
            }}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Histórico de partes ({partes.length})</h2>
          <Button asChild variant="outline">
            <Link href={`/admin/partes/nuevo?clienteId=${id}`}>
              <Plus className="size-4" /> Nuevo parte
            </Link>
          </Button>
        </div>
        <TablaPartes partes={partes} tecnicos={[]} ocultarCliente />
      </section>
    </div>
  );
}
