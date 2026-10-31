"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import type { EstadoParte, TipoVisita } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EstadoBadge } from "@/components/estado-badge";
import { api } from "@/lib/cliente-http";
import { dateToKey, formatoDia } from "@/lib/fechas";
import { resumenMuestras } from "@/lib/resumen";
import { TIPO_VISITA } from "@/lib/plan-visitas";
import { cn } from "@/lib/utils";
import { selectClase } from "./ui";

export type FilaParte = {
  id: string;
  numero: string;
  fechaPrevista: Date;
  numPedido: string | null;
  estado: EstadoParte;
  tipoVisita: TipoVisita | null;
  atencion: boolean;
  cliente: { id: string; codigo: string; nombre: string; poblacion: string | null };
  tecnico: { id: string; nombre: string; color: string } | null;
  muestras: { estado: "PENDIENTE" | "TOMADA"; tipoAgua: { nombre: string; orden: number } }[];
};

type Tecnico = { id: string; nombre: string; color: string };

export function TablaPartes({
  partes,
  tecnicos,
  seleccionable,
  ocultarCliente,
}: {
  partes: FilaParte[];
  tecnicos: Tecnico[];
  seleccionable?: boolean;
  ocultarCliente?: boolean;
}) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [tecnicoBloque, setTecnicoBloque] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const todos = partes.length > 0 && partes.every((p) => sel.has(p.id));
  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function bloque(cuerpo: { accion: "asignar"; tecnicoId: string | null } | { accion: "validar" }) {
    setOcupado(true);
    try {
      const r = await api<{ actualizados: number; omitidos: number }>("/api/admin/partes/bloque", "POST", { ...cuerpo, ids: [...sel] });
      toast.success(
        `${r.actualizados} ${r.actualizados === 1 ? "parte actualizado" : "partes actualizados"}` +
          (r.omitidos ? ` · ${r.omitidos} omitidos (${cuerpo.accion === "validar" ? "no completados" : "validados o cancelados"})` : ""),
      );
      setSel(new Set());
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-2">
      {seleccionable && sel.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-cyan-50 px-4 py-2 text-sm">
          <span className="font-medium">{sel.size} seleccionados</span>
          <span className="mx-2 h-5 w-px bg-border" />
          <select className={`${selectClase} w-48 bg-background`} value={tecnicoBloque} onChange={(e) => setTecnicoBloque(e.target.value)}>
            <option value="">— Elegir técnico —</option>
            <option value="sin">Sin asignar</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={!tecnicoBloque || ocupado}
            onClick={() => bloque({ accion: "asignar", tecnicoId: tecnicoBloque === "sin" ? null : tecnicoBloque })}
          >
            Cambiar técnico
          </Button>
          <Button size="sm" disabled={ocupado} onClick={() => bloque({ accion: "validar" })}>
            Validar completados
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSel(new Set())}>
            Quitar selección
          </Button>
        </div>
      )}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {seleccionable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={todos}
                    onCheckedChange={(c) => setSel(c === true ? new Set(partes.map((p) => p.id)) : new Set())}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
              )}
              <TableHead className="w-28">Número</TableHead>
              <TableHead className="w-28">Fecha</TableHead>
              {!ocultarCliente && <TableHead>Cliente</TableHead>}
              <TableHead>Técnico</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Muestras</TableHead>
              <TableHead className="w-40">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partes.map((p) => {
              const tomadas = p.muestras.filter((m) => m.estado === "TOMADA").length;
              return (
                <TableRow
                  key={p.id}
                  data-state={sel.has(p.id) ? "selected" : undefined}
                  className={cn(p.atencion && "bg-red-50 hover:bg-red-100 [&>td]:text-red-900")}
                >
                  {seleccionable && (
                    <TableCell>
                      <Checkbox checked={sel.has(p.id)} onCheckedChange={() => toggle(p.id)} aria-label={`Seleccionar ${p.numero}`} />
                    </TableCell>
                  )}
                  <TableCell>
                    <Link href={`/admin/partes/${p.id}`} className="font-mono text-xs font-medium hover:underline">
                      {p.numero}
                    </Link>
                    {p.tipoVisita && (
                      <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground" title={TIPO_VISITA[p.tipoVisita].label}>
                        {TIPO_VISITA[p.tipoVisita].corto}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{formatoDia(dateToKey(new Date(p.fechaPrevista)))}</TableCell>
                  {!ocultarCliente && (
                    <TableCell>
                      <Link href={`/admin/partes/${p.id}`} className="font-medium hover:underline">
                        {p.cliente.nombre}
                      </Link>
                      {p.cliente.poblacion && <span className="text-muted-foreground"> · {p.cliente.poblacion}</span>}
                    </TableCell>
                  )}
                  <TableCell>
                    {p.tecnico ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: p.tecnico.color }} />
                        {p.tecnico.nombre}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-700">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.numPedido}</TableCell>
                  <TableCell>
                    <span className="tabular-nums">
                      {tomadas}/{p.muestras.length}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">{resumenMuestras(p.muestras)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <EstadoBadge estado={p.estado} />
                      {p.atencion && <AtencionBadge />}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {partes.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No hay partes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function AtencionBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-600 px-2 py-0.5 text-xs font-bold text-white",
        className,
      )}
    >
      <AlertTriangle className="size-3" /> ATENCIÓN
    </span>
  );
}
