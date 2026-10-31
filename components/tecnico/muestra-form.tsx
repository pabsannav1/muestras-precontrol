"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { muestraDatosSchema } from "@/lib/validations";
import { muestraTomada } from "@/lib/estado";
import { cn } from "@/lib/utils";
import { CAMPOS_NUMERICOS, type ValoresMuestra } from "@/lib/muestra-campos";

type Valores = ValoresMuestra;

export function MuestraForm({
  parteId,
  cliente,
  muestra,
  inicial,
  sugerencias,
  siguiente,
  editable,
  posicion,
}: {
  parteId: string;
  cliente: string;
  muestra: { id: string; referencia: string; tipoAnalisis: string; tipoAgua: string; estado: "PENDIENTE" | "TOMADA" };
  inicial: Valores;
  sugerencias: string[];
  siguiente: { id: string; referencia: string } | null;
  editable: boolean;
  posicion: { actual: number; total: number };
}) {
  const router = useRouter();
  const [v, setV] = useState<Valores>(inicial);
  const [errores, setErrores] = useState<Partial<Record<keyof Valores, string>>>({});
  const [guardando, setGuardando] = useState<null | "volver" | "siguiente">(null);
  const [focoPunto, setFocoPunto] = useState(false);

  const set = (campo: keyof Valores) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setV((x) => ({ ...x, [campo]: e.target.value }));
    setErrores((x) => ({ ...x, [campo]: undefined }));
  };

  const parsed = muestraDatosSchema.safeParse(v);
  const quedaraTomada = parsed.success && muestraTomada(parsed.data);

  const filtro = v.puntoRecogida.trim().toLowerCase();
  const sugeridas = sugerencias
    .filter((s) => s.toLowerCase() !== filtro && (!filtro || s.toLowerCase().includes(filtro)))
    .slice(0, 8);

  async function guardar(destino: "volver" | "siguiente") {
    const r = muestraDatosSchema.safeParse(v);
    if (!r.success) {
      const errs: Partial<Record<keyof Valores, string>> = {};
      for (const issue of r.error.issues) errs[issue.path[0] as keyof Valores] ??= issue.message;
      setErrores(errs);
      toast.error("Revisa los campos marcados");
      return;
    }
    setGuardando(destino);
    try {
      const res = await fetch(`/api/muestras/${muestra.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo guardar");
        return;
      }
      toast.success(
        data.muestra.estado === "TOMADA" ? `${muestra.referencia} tomada` : `${muestra.referencia} guardada (pendiente)`,
      );
      if (destino === "siguiente" && siguiente) router.push(`/parte/${parteId}/muestra/${siguiente.id}`);
      else router.push(`/parte/${parteId}`);
      router.refresh();
    } catch {
      toast.error("Sin conexión. Vuelve a intentarlo.");
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <header className="sticky top-0 z-10 border-b bg-background px-2 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <Link
            href={`/parte/${parteId}`}
            className="flex size-11 items-center justify-center rounded-full active:bg-muted"
            aria-label="Volver al parte"
          >
            <ChevronLeft className="size-6" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-lg font-semibold leading-tight">
              {muestra.referencia}
              {muestra.estado === "TOMADA" && <CheckCircle2 className="size-5 text-emerald-600" />}
              <span className="ml-auto pr-2 text-xs font-normal text-muted-foreground tabular-nums">
                {posicion.actual}/{posicion.total}
              </span>
            </p>
            <p className="truncate text-xs text-muted-foreground">{cliente}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 px-2">
          <span className="rounded-md bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-900">{muestra.tipoAgua}</span>
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{muestra.tipoAnalisis}</span>
        </div>
      </header>

      <form
        className="space-y-5 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          guardar("volver");
        }}
      >
        <fieldset disabled={!editable} className="space-y-5">
          <div className="grid gap-1.5">
            <Label htmlFor="puntoRecogida">Punto de recogida</Label>
            <Input
              id="puntoRecogida"
              value={v.puntoRecogida}
              onChange={set("puntoRecogida")}
              onFocus={() => setFocoPunto(true)}
              onBlur={() => setTimeout(() => setFocoPunto(false), 150)}
              placeholder="Depósito, Acumulador, PTR 12…"
              autoComplete="off"
              enterKeyHint="next"
              className="h-12 rounded-xl text-base"
            />
            {(focoPunto || !v.puntoRecogida) && sugeridas.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {sugeridas.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setV((x) => ({ ...x, puntoRecogida: s }))}
                    className="h-9 rounded-full border bg-background px-3 text-sm active:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CAMPOS_NUMERICOS.map(({ campo, label, unidad }) => (
              <div key={campo} className="grid gap-1.5">
                <Label htmlFor={campo}>{label}</Label>
                <div className="relative">
                  <Input
                    id={campo}
                    value={v[campo]}
                    onChange={set(campo)}
                    inputMode="decimal"
                    autoComplete="off"
                    enterKeyHint="next"
                    aria-invalid={!!errores[campo]}
                    className={cn("h-12 rounded-xl text-base tabular-nums", unidad && "pr-14")}
                  />
                  {unidad && (
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                      {unidad}
                    </span>
                  )}
                </div>
                {errores[campo] && <p className="text-xs text-destructive">{errores[campo]}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="fechaToma">Fecha</Label>
              <Input id="fechaToma" type="date" value={v.fechaToma} onChange={set("fechaToma")} className="h-12 rounded-xl text-base" />
              {errores.fechaToma && <p className="text-xs text-destructive">{errores.fechaToma}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="horaToma">Hora</Label>
              <Input id="horaToma" type="time" value={v.horaToma} onChange={set("horaToma")} className="h-12 rounded-xl text-base" />
              {errores.horaToma && <p className="text-xs text-destructive">{errores.horaToma}</p>}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" value={v.observaciones} onChange={set("observaciones")} rows={3} className="rounded-xl text-base" />
          </div>
        </fieldset>

        {editable ? (
          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 space-y-2 border-t bg-background/95 px-4 pb-3 pt-3 backdrop-blur">
            <p className={cn("text-center text-xs", quedaraTomada ? "text-emerald-700" : "text-muted-foreground")}>
              {quedaraTomada
                ? "Se guardará como TOMADA"
                : "Para marcarla como tomada: punto de recogida y al menos un dato medido"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="submit" variant="outline" className="h-14 rounded-xl text-base" disabled={!!guardando}>
                {guardando === "volver" && <Loader2 className="size-5 animate-spin" />}
                Guardar
              </Button>
              <Button
                type="button"
                className="h-14 rounded-xl bg-cyan-700 text-base hover:bg-cyan-800"
                disabled={!!guardando}
                onClick={() => guardar("siguiente")}
              >
                {guardando === "siguiente" && <Loader2 className="size-5 animate-spin" />}
                {siguiente ? `Guardar y ${siguiente.referencia}` : "Guardar y terminar"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-muted p-3 text-center text-sm text-muted-foreground">Parte validado: solo consulta.</p>
        )}
      </form>
    </div>
  );
}
