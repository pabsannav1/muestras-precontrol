"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, erroresCampos } from "@/lib/cliente-http";
import { CAMPOS_NUMERICOS, numATexto, valoresDesdeMuestra, type ValoresMuestra } from "@/lib/muestra-campos";
import { muestraAdminSchema } from "@/lib/validations";
import { LineasMuestras, lineasParaApi, lineaVacia, type Linea, type Opcion } from "./lineas-muestras";
import { selectClase } from "./ui";

export type MuestraFila = {
  id: string;
  referencia: string;
  estado: "PENDIENTE" | "TOMADA";
  tipoAnalisis: Opcion;
  tipoAgua: Opcion;
  puntoRecogida: string | null;
  temperatura: number | null;
  temperaturaAC: number | null;
  cloro: number | null;
  conductividad: number | null;
  ph: number | null;
  hierro: number | null;
  fechaToma: Date | null;
  horaToma: string | null;
  observaciones: string | null;
  tomadaPor: { nombre: string } | null;
};

export function MuestrasAdmin({
  parteId,
  planificado,
  muestras,
  tiposAnalisis,
  tiposAgua,
}: {
  parteId: string;
  planificado: boolean;
  muestras: MuestraFila[];
  tiposAnalisis: Opcion[];
  tiposAgua: Opcion[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<MuestraFila | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia()]);
  const [anadiendo, setAnadiendo] = useState(false);

  async function anadir() {
    const l = lineasParaApi(lineas);
    if (!l.length || l.some((x) => !x.tipoAnalisisId || !x.tipoAguaId || !(x.cantidad >= 1)))
      return toast.error("Completa cantidad, tipo de análisis y tipo de agua");
    setAnadiendo(true);
    try {
      const r = await api<{ creadas: number }>(`/api/admin/partes/${parteId}/muestras`, "POST", { lineas: l });
      toast.success(`${r.creadas} ${r.creadas === 1 ? "muestra añadida" : "muestras añadidas"}`);
      setLineas([lineaVacia()]);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setAnadiendo(false);
    }
  }

  async function quitar(m: MuestraFila) {
    const aviso = m.estado === "TOMADA" ? " Tiene datos rellenados por el técnico, que se perderán." : "";
    const renum = planificado ? " Las referencias se renumerarán." : "";
    if (!confirm(`¿Quitar ${m.referencia}?${aviso}${renum}`)) return;
    try {
      await api(`/api/admin/partes/${parteId}/muestras/${m.id}`, "DELETE");
      toast.success(`${m.referencia} quitada`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Ref.</TableHead>
              <TableHead>Análisis</TableHead>
              <TableHead>Agua</TableHead>
              <TableHead>Punto</TableHead>
              {CAMPOS_NUMERICOS.map((c) => (
                <TableHead key={c.campo} className="text-right" title={`${c.label} ${c.unidad}`}>
                  {c.corto}
                </TableHead>
              ))}
              <TableHead>Toma</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {muestras.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    {m.estado === "TOMADA" ? (
                      <CheckCircle2 className="size-4 text-emerald-600" aria-label="Tomada" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground/50" aria-label="Pendiente" />
                    )}
                    {m.referencia}
                  </span>
                </TableCell>
                <TableCell className="max-w-56 truncate" title={m.tipoAnalisis.nombre}>
                  {m.tipoAnalisis.nombre}
                </TableCell>
                <TableCell>{m.tipoAgua.nombre}</TableCell>
                <TableCell className="max-w-40 truncate" title={m.observaciones ?? undefined}>
                  {m.puntoRecogida}
                  {m.observaciones && <span className="ml-1 text-amber-600">*</span>}
                </TableCell>
                {CAMPOS_NUMERICOS.map((c) => (
                  <TableCell key={c.campo} className="text-right tabular-nums">
                    {numATexto(m[c.campo as keyof MuestraFila] as number | null)}
                  </TableCell>
                ))}
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {m.fechaToma && new Date(m.fechaToma).toISOString().slice(0, 10).split("-").reverse().join("/")} {m.horaToma}
                  {m.tomadaPor && <div>{m.tomadaPor.nombre}</div>}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => setEditando(m)} aria-label={`Editar ${m.referencia}`}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => quitar(m)} aria-label={`Quitar ${m.referencia}`}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {muestras.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="py-8 text-center text-muted-foreground">
                  Este parte no tiene muestras.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2 rounded-xl border bg-card p-4">
        <Label>Añadir muestras</Label>
        <LineasMuestras lineas={lineas} onChange={setLineas} tiposAnalisis={tiposAnalisis} tiposAgua={tiposAgua} />
        <div className="flex justify-end">
          <Button onClick={anadir} disabled={anadiendo}>
            {anadiendo && <Loader2 className="size-4 animate-spin" />}
            Añadir al parte
          </Button>
        </div>
      </div>

      {editando && (
        <EditarMuestraDialog
          key={editando.id}
          parteId={parteId}
          muestra={editando}
          tiposAnalisis={tiposAnalisis}
          tiposAgua={tiposAgua}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function EditarMuestraDialog({
  parteId,
  muestra,
  tiposAnalisis,
  tiposAgua,
  onClose,
}: {
  parteId: string;
  muestra: MuestraFila;
  tiposAnalisis: Opcion[];
  tiposAgua: Opcion[];
  onClose: () => void;
}) {
  const router = useRouter();
  // El admin no rellena fecha/hora por defecto: solo corrige lo que haya
  const [v, setV] = useState<ValoresMuestra>(valoresDesdeMuestra(muestra, { fecha: "", hora: "" }));
  const [tipoAnalisisId, setTipoAnalisisId] = useState(muestra.tipoAnalisis.id);
  const [tipoAguaId, setTipoAguaId] = useState(muestra.tipoAgua.id);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  // Si un tipo está inactivo y ya asignado, mantenerlo en la lista
  const opcionesAnalisis = tiposAnalisis.some((t) => t.id === muestra.tipoAnalisis.id) ? tiposAnalisis : [muestra.tipoAnalisis, ...tiposAnalisis];
  const opcionesAgua = tiposAgua.some((t) => t.id === muestra.tipoAgua.id) ? tiposAgua : [muestra.tipoAgua, ...tiposAgua];

  const set = (campo: keyof ValoresMuestra) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setV((x) => ({ ...x, [campo]: e.target.value }));
    setErrores((x) => ({ ...x, [campo]: "" }));
  };

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const cuerpo = { ...v, tipoAnalisisId, tipoAguaId };
    const r = muestraAdminSchema.safeParse(cuerpo);
    if (!r.success) {
      const errs: Record<string, string> = {};
      for (const i of r.error.issues) errs[String(i.path[0])] ??= i.message;
      return setErrores(errs);
    }
    setGuardando(true);
    try {
      await api(`/api/admin/partes/${parteId}/muestras/${muestra.id}`, "PUT", cuerpo);
      toast.success(`${muestra.referencia} guardada`);
      onClose();
      router.refresh();
    } catch (err) {
      setErrores(erroresCampos(err));
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Muestra {muestra.referencia}</DialogTitle>
          <DialogDescription>
            {muestra.estado === "TOMADA" ? `Tomada${muestra.tomadaPor ? ` por ${muestra.tomadaPor.nombre}` : ""}` : "Pendiente"}. Los
            cambios quedan registrados.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={guardar} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ta">Tipo de análisis</Label>
              <select id="ta" className={selectClase} value={tipoAnalisisId} onChange={(e) => setTipoAnalisisId(e.target.value)}>
                {opcionesAnalisis.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tg">Tipo de agua</Label>
              <select id="tg" className={selectClase} value={tipoAguaId} onChange={(e) => setTipoAguaId(e.target.value)}>
                {opcionesAgua.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="punto">Punto de recogida</Label>
            <Input id="punto" value={v.puntoRecogida} onChange={set("puntoRecogida")} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CAMPOS_NUMERICOS.map(({ campo, label, unidad }) => (
              <div key={campo} className="grid gap-1.5">
                <Label htmlFor={`a-${campo}`}>
                  {label} {unidad && <span className="font-normal text-muted-foreground">({unidad})</span>}
                </Label>
                <Input id={`a-${campo}`} inputMode="decimal" value={v[campo]} onChange={set(campo)} aria-invalid={!!errores[campo]} className="tabular-nums" />
                {errores[campo] && <p className="text-xs text-destructive">{errores[campo]}</p>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="a-fecha">Fecha de toma</Label>
              <Input id="a-fecha" type="date" value={v.fechaToma} onChange={set("fechaToma")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="a-hora">Hora de toma</Label>
              <Input id="a-hora" type="time" value={v.horaToma} onChange={set("horaToma")} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-obs">Observaciones</Label>
            <Textarea id="a-obs" rows={2} value={v.observaciones} onChange={set("observaciones")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando && <Loader2 className="size-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
