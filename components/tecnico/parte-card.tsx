import Link from "next/link";
import { AlertTriangle, MapPin } from "lucide-react";
import type { ParteTarjeta } from "@/lib/partes";
import { ESTADO_PARTE } from "@/lib/ui-estado";
import { EstadoBadge } from "@/components/estado-badge";
import { formatoDia } from "@/lib/fechas";
import { cn } from "@/lib/utils";

export function ParteCard({ parte, mostrarFecha, atrasado }: { parte: ParteTarjeta; mostrarFecha?: boolean; atrasado?: boolean }) {
  const pct = parte.total ? Math.round((parte.tomadas / parte.total) * 100) : 0;
  return (
    <Link
      href={`/parte/${parte.id}`}
      className="relative block overflow-hidden rounded-xl border bg-card p-3 pl-4 shadow-xs transition active:scale-[0.99] active:bg-muted"
    >
      <span className={cn("absolute inset-y-0 left-0 w-1.5", ESTADO_PARTE[parte.estado].barra)} />
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight">{parte.cliente}</h3>
        <EstadoBadge estado={parte.estado} className="shrink-0" />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
        {parte.poblacion && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {parte.poblacion}
          </span>
        )}
        {parte.numPedido && <span>Ped. {parte.numPedido}</span>}
        {mostrarFecha && (
          <span className={cn("inline-flex items-center gap-1", atrasado && "font-medium text-rose-700")}>
            {atrasado && <AlertTriangle className="size-3.5" />}
            {formatoDia(parte.fecha)}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {parte.progreso.map((p) => (
          <span
            key={p.tipoAgua}
            className={cn(
              "rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums",
              p.tomadas === p.total ? "bg-emerald-100 text-emerald-800" : "bg-muted text-foreground",
            )}
          >
            {p.tipoAgua} {p.tomadas}/{p.total}
          </span>
        ))}
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" aria-label={`${pct}% tomado`}>
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}
