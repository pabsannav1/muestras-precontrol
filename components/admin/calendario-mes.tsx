"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ExternalLink, Plus } from "lucide-react";
import type { EstadoParte, TipoVisita } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/cliente-http";
import { ESTADO_PARTE } from "@/lib/ui-estado";
import { TIPO_VISITA } from "@/lib/plan-visitas";
import { cn } from "@/lib/utils";
import { selectClase } from "./ui";

export type ParteCalendario = {
  id: string;
  numero: string;
  fecha: string; // YYYY-MM-DD
  estado: EstadoParte;
  atencion: boolean;
  tipoVisita: TipoVisita | null;
  cliente: string;
  poblacion: string | null;
  tecnico: { id: string; nombre: string; color: string } | null;
  muestras: number;
};

type Tecnico = { id: string; nombre: string; color: string };

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const EDITABLE: EstadoParte[] = ["PLANIFICADO", "EN_CURSO", "COMPLETADO"];

export function CalendarioMes({
  mes,
  dias,
  hoy,
  partes,
  tecnicos,
}: {
  mes: string; // YYYY-MM
  dias: string[]; // semanas completas lun–dom
  hoy: string;
  partes: ParteCalendario[];
  tecnicos: Tecnico[];
}) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [soloSinAsignar, setSoloSinAsignar] = useState(false);
  const [filtroTecnico, setFiltroTecnico] = useState("");
  const [tecnicoDestino, setTecnicoDestino] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const visibles = useMemo(
    () =>
      partes.filter(
        (p) =>
          (!soloSinAsignar || !p.tecnico) &&
          (!filtroTecnico || (filtroTecnico === "sin" ? !p.tecnico : p.tecnico?.id === filtroTecnico)),
      ),
    [partes, soloSinAsignar, filtroTecnico],
  );
  const porDia = useMemo(() => {
    const m = new Map<string, ParteCalendario[]>();
    for (const p of visibles) m.set(p.fecha, [...(m.get(p.fecha) ?? []), p]);
    return m;
  }, [visibles]);

  const delMes = partes.filter((p) => p.fecha.startsWith(mes));
  const sinAsignar = delMes.filter((p) => !p.tecnico).length;
  const muestrasMes = delMes.reduce((s, p) => s + p.muestras, 0);
  const cargaTecnico = tecnicos.map((t) => ({
    ...t,
    partes: delMes.filter((p) => p.tecnico?.id === t.id).length,
    muestras: delMes.filter((p) => p.tecnico?.id === t.id).reduce((s, p) => s + p.muestras, 0),
  }));

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  function seleccionarDia(dia: string) {
    const ids = (porDia.get(dia) ?? []).filter((p) => EDITABLE.includes(p.estado)).map((p) => p.id);
    setSel((s) => {
      const todos = ids.every((id) => s.has(id));
      const n = new Set(s);
      for (const id of ids) {
        if (todos) n.delete(id);
        else n.add(id);
      }
      return n;
    });
  }

  async function asignar() {
    if (!tecnicoDestino) return;
    setOcupado(true);
    try {
      const r = await api<{ actualizados: number; omitidos: number }>("/api/admin/partes/bloque", "POST", {
        accion: "asignar",
        ids: [...sel],
        tecnicoId: tecnicoDestino === "sin" ? null : tecnicoDestino,
      });
      toast.success(
        `${r.actualizados} ${r.actualizados === 1 ? "parte asignado" : "partes asignados"}` + (r.omitidos ? ` · ${r.omitidos} omitidos (validados)` : ""),
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
    <div className="space-y-3">
      {/* Resumen del mes y carga por técnico */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-md border bg-card px-2.5 py-1">
          <strong className="tabular-nums">{delMes.length}</strong> partes · <strong className="tabular-nums">{muestrasMes}</strong> muestras
        </span>
        <button
          type="button"
          onClick={() => setSoloSinAsignar((x) => !x)}
          className={cn(
            "rounded-md border px-2.5 py-1",
            sinAsignar ? "border-amber-300 bg-amber-50 text-amber-800" : "bg-card text-muted-foreground",
            soloSinAsignar && "ring-2 ring-amber-500",
          )}
        >
          <strong className="tabular-nums">{sinAsignar}</strong> sin asignar {soloSinAsignar ? "· mostrando solo estos" : ""}
        </button>
        {cargaTecnico.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFiltroTecnico((x) => (x === t.id ? "" : t.id))}
            className={cn("inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1", filtroTecnico === t.id && "ring-2 ring-cyan-600")}
            title="Filtrar por este técnico"
          >
            <span className="size-2.5 rounded-full" style={{ backgroundColor: t.color }} />
            {t.nombre}
            <span className="tabular-nums text-muted-foreground">
              {t.partes}p · {t.muestras}m
            </span>
          </button>
        ))}
      </div>

      {/* Barra de asignación */}
      <div
        className={cn(
          "sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border px-4 py-2 text-sm",
          sel.size ? "bg-cyan-50 shadow-sm" : "bg-card text-muted-foreground",
        )}
      >
        {sel.size ? (
          <>
            <span className="font-medium text-foreground">{sel.size} seleccionados</span>
            <select className={`${selectClase} w-48 bg-background`} value={tecnicoDestino} onChange={(e) => setTecnicoDestino(e.target.value)}>
              <option value="">— Asignar a —</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
              <option value="sin">Quitar técnico</option>
            </select>
            <Button size="sm" disabled={!tecnicoDestino || ocupado} onClick={asignar}>
              Asignar
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSel(new Set())}>
              Quitar selección
            </Button>
          </>
        ) : (
          <span>Haz clic en los partes (o en el número del día para seleccionar todo el día) y asígnalos a un técnico.</span>
        )}
      </div>

      {/* Rejilla */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium text-muted-foreground">
          {DIAS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((dia, i) => {
            const lista = porDia.get(dia) ?? [];
            const fuera = !dia.startsWith(mes);
            const finde = i % 7 >= 5;
            const muestras = lista.reduce((s, p) => s + p.muestras, 0);
            return (
              <div
                key={dia}
                className={cn(
                  "group min-h-28 border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0",
                  fuera && "bg-muted/30 text-muted-foreground",
                  finde && !fuera && "bg-muted/15",
                )}
              >
                <div className="mb-1 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => seleccionarDia(dia)}
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-medium hover:bg-muted",
                      dia === hoy && "bg-cyan-700 text-white hover:bg-cyan-800",
                    )}
                    title="Seleccionar los partes del día"
                  >
                    {Number(dia.slice(8))}
                  </button>
                  {muestras > 0 && <span className="text-[10px] text-muted-foreground">{muestras} m</span>}
                  <Link
                    href={`/admin/partes/nuevo?fecha=${dia}`}
                    className="ml-auto rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100"
                    title="Nuevo parte este día"
                  >
                    <Plus className="size-3.5" />
                  </Link>
                </div>
                <div className="space-y-1">
                  {lista.map((p) => {
                    const editable = EDITABLE.includes(p.estado);
                    return (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => editable && toggle(p.id)}
                        onKeyDown={(e) => e.key === "Enter" && editable && toggle(p.id)}
                        title={`${p.numero} · ${p.cliente}${p.poblacion ? ` (${p.poblacion})` : ""}\n${p.tecnico?.nombre ?? "Sin asignar"} · ${ESTADO_PARTE[p.estado].label} · ${p.muestras} muestras${p.tipoVisita ? ` · ${TIPO_VISITA[p.tipoVisita].label}` : ""}`}
                        className={cn(
                          "group/p flex items-center gap-1 rounded border-l-4 bg-background px-1.5 py-1 text-[11px] leading-tight shadow-xs",
                          editable ? "cursor-pointer hover:bg-muted" : "opacity-60",
                          !p.tecnico && "border-dashed border-amber-500 bg-amber-50",
                          p.atencion && "bg-red-50 text-red-800",
                          sel.has(p.id) && "ring-2 ring-cyan-600",
                          p.estado === "CANCELADO" && "line-through",
                        )}
                        style={p.tecnico ? { borderLeftColor: p.tecnico.color } : undefined}
                      >
                        {p.atencion && <AlertTriangle className="size-3 shrink-0 text-red-600" />}
                        <span className="min-w-0 flex-1 truncate font-medium">{p.cliente}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">{p.muestras}</span>
                        <Link
                          href={`/admin/partes/${p.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 text-muted-foreground opacity-0 hover:text-foreground group-hover/p:opacity-100"
                          title="Abrir parte"
                        >
                          <ExternalLink className="size-3" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Borde de color = técnico · borde discontinuo ámbar = sin asignar · el número de la derecha son las muestras del parte.
      </p>
    </div>
  );
}
