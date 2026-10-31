"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClase } from "./ui";

export type Opcion = { id: string; nombre: string };
export type Linea = { cantidad: string; tipoAnalisisId: string; tipoAguaId: string };

export const lineaVacia = (): Linea => ({ cantidad: "1", tipoAnalisisId: "", tipoAguaId: "" });

/** Editor de líneas "N × tipo de análisis · tipo de agua". */
export function LineasMuestras({
  lineas,
  onChange,
  tiposAnalisis,
  tiposAgua,
}: {
  lineas: Linea[];
  onChange: (l: Linea[]) => void;
  tiposAnalisis: Opcion[];
  tiposAgua: Opcion[];
}) {
  const set = (i: number, campo: keyof Linea, valor: string) => onChange(lineas.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));
  const total = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0), 0);

  return (
    <div className="space-y-2">
      {lineas.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={50}
            value={l.cantidad}
            onChange={(e) => set(i, "cantidad", e.target.value)}
            className="w-20 tabular-nums"
            aria-label="Cantidad"
          />
          <span className="text-muted-foreground">×</span>
          <select className={`${selectClase} flex-[2]`} value={l.tipoAnalisisId} onChange={(e) => set(i, "tipoAnalisisId", e.target.value)} aria-label="Tipo de análisis">
            <option value="">Tipo de análisis…</option>
            {tiposAnalisis.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground">·</span>
          <select className={`${selectClase} flex-1`} value={l.tipoAguaId} onChange={(e) => set(i, "tipoAguaId", e.target.value)} aria-label="Tipo de agua">
            <option value="">Tipo de agua…</option>
            {tiposAgua.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(lineas.filter((_, j) => j !== i))} aria-label="Quitar línea">
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...lineas, lineaVacia()])}>
          <Plus className="size-4" /> Añadir línea
        </Button>
        {total > 0 && <span className="text-sm text-muted-foreground">Se crearán {total} muestras</span>}
      </div>
    </div>
  );
}

/** Líneas completas listas para la API (descarta las vacías). */
export function lineasParaApi(lineas: Linea[]) {
  return lineas
    .filter((l) => l.tipoAnalisisId || l.tipoAguaId)
    .map((l) => ({ tipoAnalisisId: l.tipoAnalisisId, tipoAguaId: l.tipoAguaId, cantidad: Number(l.cantidad) }));
}
