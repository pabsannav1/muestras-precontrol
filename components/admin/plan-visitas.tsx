import Link from "next/link";
import { CalendarClock, Plus } from "lucide-react";
import type { EstadoParte, TipoVisita } from "@prisma/client";
import { EstadoBadge } from "@/components/estado-badge";
import { AtencionBadge } from "@/components/admin/tabla-partes";
import { Button } from "@/components/ui/button";
import { TIPO_VISITA, addMeses, ventanaVisita } from "@/lib/plan-visitas";
import { addDays, dateToKey, formatoDia } from "@/lib/fechas";
import { cn } from "@/lib/utils";

type ParteFicha = {
  id: string;
  numero: string;
  fechaPrevista: Date;
  estado: EstadoParte;
  tipoVisita: TipoVisita | null;
  atencion: boolean;
};

const PLAN = ["LIMPIEZA", "TOMA_1", "TOMA_2", "TOMA_3", "TOMA_4"] as const;
const HECHO: EstadoParte[] = ["COMPLETADO", "VALIDADO"];

const fmt = (k: string) => formatoDia(k);

/**
 * Plan del periodo de contrato vigente: desde la firma (con 15 días de margen antes)
 * hasta 12 meses después. Los partes se reparten por su "visita del contrato".
 */
export function PlanVisitas({
  clienteId,
  fechaContrato,
  partes,
  hoy,
}: {
  clienteId: string;
  fechaContrato: string | null;
  partes: ParteFicha[];
  hoy: string;
}) {
  if (!fechaContrato) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-5 text-sm text-muted-foreground">
        Indica la <strong>fecha de firma del contrato</strong> en la ficha para ver el plan de visitas (limpieza, 4 tomas y extras).
      </div>
    );
  }

  const ini = addDays(fechaContrato, -15);
  const fin = addMeses(fechaContrato, 12);
  const delPeriodo = partes.filter((p) => {
    const k = dateToKey(p.fechaPrevista);
    return k >= ini && k < fin && p.estado !== "CANCELADO";
  });
  const porTipo = (t: TipoVisita) =>
    delPeriodo.filter((p) => p.tipoVisita === t).sort((a, b) => +a.fechaPrevista - +b.fechaPrevista);

  const limpieza = porTipo("LIMPIEZA")[0];
  // Las tomas se cuentan desde la limpieza real si existe
  const inicio = limpieza ? dateToKey(limpieza.fechaPrevista) : fechaContrato;
  const extras = porTipo("EXTRA");
  const sinClasificar = delPeriodo.filter((p) => !p.tipoVisita);
  const nuevo = (tipo: TipoVisita, fecha: string) => `/admin/partes/nuevo?clienteId=${clienteId}&tipo=${tipo}&fecha=${fecha}`;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Periodo del contrato: {fmt(fechaContrato)} – {fmt(addDays(fin, -1))}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PLAN.map((tipo, i) => {
          const v = ventanaVisita(tipo, inicio);
          const lista = porTipo(tipo);
          const hecho = lista.some((p) => HECHO.includes(p.estado));
          const atencion = lista.some((p) => p.atencion);
          const vencido = !lista.length && v.hasta < hoy;
          return (
            <div
              key={tipo}
              className={cn(
                "flex flex-col gap-2 rounded-xl border bg-card p-4",
                hecho && "border-emerald-300 bg-emerald-50/50",
                vencido && "border-red-300 bg-red-50/60",
                atencion && "border-red-500 ring-2 ring-red-500/30",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full bg-muted text-xs font-bold",
                    hecho && "bg-emerald-600 text-white",
                    vencido && "bg-red-600 text-white",
                  )}
                >
                  {i === 0 ? "L" : i}
                </span>
                <h3 className="text-sm font-semibold leading-tight">{TIPO_VISITA[tipo].label}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{TIPO_VISITA[tipo].descripcion}</p>
              <p className="flex items-center gap-1 text-xs capitalize">
                <CalendarClock className="size-3.5 text-muted-foreground" />
                {v.desde === v.hasta ? fmt(v.desde) : `${fmt(v.desde)} – ${fmt(v.hasta)}`}
              </p>
              <div className="mt-auto space-y-1.5 pt-1">
                {lista.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/partes/${p.id}`}
                    className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 text-xs hover:border-cyan-600"
                  >
                    <span className="font-mono font-medium">{p.numero}</span>
                    <span className="capitalize text-muted-foreground">{fmt(dateToKey(p.fechaPrevista))}</span>
                    <EstadoBadge estado={p.estado} />
                    {p.atencion && <AtencionBadge />}
                  </Link>
                ))}
                {!lista.length && (
                  <>
                    <p className={cn("text-xs font-medium", vencido ? "text-red-700" : "text-muted-foreground")}>
                      {vencido ? "Fuera de plazo, sin parte" : "Pendiente"}
                    </p>
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link href={nuevo(tipo, v.ideal < hoy ? hoy : v.ideal)}>
                        <Plus className="size-3.5" /> Crear parte
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">
            Tomas extra por positivos <span className="font-normal text-muted-foreground">({extras.length})</span>
          </h3>
          <Button asChild size="sm" variant="outline">
            <Link href={nuevo("EXTRA", hoy)}>
              <Plus className="size-3.5" /> Nueva extra
            </Link>
          </Button>
        </div>
        {extras.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {extras.map((p) => (
              <Link
                key={p.id}
                href={`/admin/partes/${p.id}`}
                className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 text-xs hover:border-cyan-600"
              >
                <span className="font-mono font-medium">{p.numero}</span>
                <span className="capitalize text-muted-foreground">{fmt(dateToKey(p.fechaPrevista))}</span>
                <EstadoBadge estado={p.estado} />
                {p.atencion && <AtencionBadge />}
              </Link>
            ))}
          </div>
        )}
      </div>

      {sinClasificar.length > 0 && (
        <p className="text-xs text-amber-700">
          {sinClasificar.length} {sinClasificar.length === 1 ? "parte de este periodo no tiene" : "partes de este periodo no tienen"} visita
          asignada ({sinClasificar.map((p) => p.numero).join(", ")}). Ábrelos y elige la visita del contrato para que aparezcan en el plan.
        </p>
      )}
    </div>
  );
}
