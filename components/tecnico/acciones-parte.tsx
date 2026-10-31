"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck, Plus } from "lucide-react";
import type { EstadoParte } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Opcion = { id: string; nombre: string };

const selectClase =
  "h-12 w-full rounded-xl border bg-background px-3 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function AccionesParte({
  parteId,
  estado,
  pendientes,
  tiposAnalisis,
  tiposAgua,
}: {
  parteId: string;
  estado: EstadoParte;
  pendientes: number;
  tiposAnalisis: Opcion[];
  tiposAgua: Opcion[];
}) {
  const router = useRouter();
  const [extraAbierto, setExtraAbierto] = useState(false);
  const [cerrarAbierto, setCerrarAbierto] = useState(false);
  const [tipoAnalisisId, setTipoAnalisisId] = useState("");
  const [tipoAguaId, setTipoAguaId] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function anadirExtra() {
    setOcupado(true);
    const res = await fetch(`/api/partes/${parteId}/muestras`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipoAnalisisId, tipoAguaId }),
    });
    const data = await res.json().catch(() => ({}));
    setOcupado(false);
    if (!res.ok) return toast.error(data.error ?? "No se pudo añadir");
    toast.success(`Muestra ${data.muestra.referencia} añadida`);
    setExtraAbierto(false);
    router.push(`/parte/${parteId}/muestra/${data.muestra.id}`);
  }

  async function cerrar() {
    setOcupado(true);
    const res = await fetch(`/api/partes/${parteId}/cerrar`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setOcupado(false);
    setCerrarAbierto(false);
    if (!res.ok) return toast.error(data.error ?? "No se pudo cerrar");
    toast.success("Parte cerrado");
    router.refresh();
  }

  return (
    <div className="grid gap-3 pb-4">
      <Button variant="outline" className="h-12 rounded-xl text-base" onClick={() => setExtraAbierto(true)}>
        <Plus className="size-5" /> Añadir muestra extra
      </Button>
      {estado !== "COMPLETADO" && (
        <Button className="h-12 rounded-xl bg-emerald-600 text-base hover:bg-emerald-700" onClick={() => setCerrarAbierto(true)}>
          <CheckCheck className="size-5" /> Cerrar parte
        </Button>
      )}

      <Dialog open={extraAbierto} onOpenChange={setExtraAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Muestra extra</DialogTitle>
            <DialogDescription>Se añadirá al final del parte con la siguiente referencia.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ta">Tipo de análisis</Label>
              <select id="ta" className={selectClase} value={tipoAnalisisId} onChange={(e) => setTipoAnalisisId(e.target.value)}>
                <option value="">Elegir…</option>
                {tiposAnalisis.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tg">Tipo de agua</Label>
              <select id="tg" className={selectClase} value={tipoAguaId} onChange={(e) => setTipoAguaId(e.target.value)}>
                <option value="">Elegir…</option>
                {tiposAgua.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button className="h-12 rounded-xl text-base" disabled={!tipoAnalisisId || !tipoAguaId || ocupado} onClick={anadirExtra}>
              Añadir y rellenar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cerrarAbierto} onOpenChange={setCerrarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cerrar parte?</DialogTitle>
            <DialogDescription>
              {pendientes > 0
                ? `Quedan ${pendientes} ${pendientes === 1 ? "muestra pendiente" : "muestras pendientes"}. El parte se marcará como completado igualmente.`
                : "Todas las muestras están tomadas. El parte se marcará como completado."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-12 rounded-xl" onClick={() => setCerrarAbierto(false)}>
              Volver
            </Button>
            <Button className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700" disabled={ocupado} onClick={cerrar}>
              Cerrar parte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
