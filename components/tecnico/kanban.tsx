"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarSearch, Loader2, RefreshCw } from "lucide-react";
import type { ParteTarjeta } from "@/lib/partes";
import { addDays, formatoDia, hoyKey, lunesDe, rangoDias } from "@/lib/fechas";
import { ParteCard } from "./parte-card";
import { cn } from "@/lib/utils";

type Modo = "hoy" | "semana" | "fecha";
type Datos = { hoy: string; desde: string; hasta: string; partes: ParteTarjeta[]; atrasados: ParteTarjeta[] };

function rangoPara(modo: Modo, foco: string) {
  if (modo === "semana") {
    const lunes = lunesDe(foco);
    return { desde: lunes, hasta: addDays(lunes, 6) };
  }
  return { desde: addDays(foco, -3), hasta: addDays(foco, 10) };
}

export function Kanban() {
  const [modo, setModo] = useState<Modo>("hoy");
  const [foco, setFoco] = useState(() => hoyKey());
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const fechaInput = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    const { desde, hasta } = rangoPara(modo, foco);
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/me/partes?desde=${desde}&hasta=${hasta}`, { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Error al cargar");
      setDatos(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sin conexión");
    } finally {
      setCargando(false);
    }
  }, [modo, foco]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Recargar al volver a la app
  useEffect(() => {
    const onVis = () => document.visibilityState === "visible" && cargar();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [cargar]);

  // Centrar en el día de foco cuando cambian los datos
  useLayoutEffect(() => {
    if (!datos) return;
    const col = scroller.current?.querySelector<HTMLElement>(`[data-dia="${foco}"]`);
    col?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [datos, foco]);

  const hoy = datos?.hoy ?? hoyKey();
  const dias = datos ? rangoDias(datos.desde, datos.hasta) : [];
  const porDia = new Map<string, ParteTarjeta[]>();
  for (const p of datos?.partes ?? []) porDia.set(p.fecha, [...(porDia.get(p.fecha) ?? []), p]);
  const idsAtrasados = new Set(datos?.atrasados.map((p) => p.id));

  return (
    <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
      <header className="sticky top-0 z-10 border-b bg-background px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Mis días</h1>
          <button
            type="button"
            onClick={cargar}
            className="flex size-10 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
            aria-label="Recargar"
          >
            {cargando ? <Loader2 className="size-5 animate-spin" /> : <RefreshCw className="size-5" />}
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          <Chip
            activo={modo === "hoy" && foco === hoy}
            onClick={() => {
              setModo("hoy");
              setFoco(hoyKey());
            }}
          >
            Hoy
          </Chip>
          <Chip
            activo={modo === "semana"}
            onClick={() => {
              setModo("semana");
              setFoco(hoyKey());
            }}
          >
            Semana
          </Chip>
          <label className="relative">
            <Chip activo={modo === "fecha"} onClick={() => fechaInput.current?.showPicker?.()}>
              <CalendarSearch className="size-4" />
              {modo === "fecha" ? formatoDia(foco) : "Ir a fecha"}
            </Chip>
            <input
              ref={fechaInput}
              type="date"
              className="pointer-events-none absolute inset-0 opacity-0"
              tabIndex={-1}
              aria-label="Saltar a fecha"
              onChange={(e) => {
                if (!e.target.value) return;
                setModo("fecha");
                setFoco(e.target.value);
              }}
            />
          </label>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div
        ref={scroller}
        className="flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 py-3 [scrollbar-width:none]"
      >
        <Columna
          titulo="Atrasados"
          icono={<AlertTriangle className="size-4" />}
          clase="border-rose-200 bg-rose-50/70"
          tituloClase="text-rose-700"
          partes={datos?.atrasados ?? []}
          vacio="Nada atrasado 👍"
          mostrarFecha
          atrasado
        />
        {dias.map((d) => (
          <Columna
            key={d}
            dia={d}
            titulo={d === hoy ? `Hoy · ${formatoDia(d)}` : formatoDia(d)}
            clase={cn(d === hoy && "border-cyan-300 bg-cyan-50/70", d < hoy && "opacity-80")}
            tituloClase={cn(d === hoy && "text-cyan-800")}
            partes={porDia.get(d) ?? []}
            idsAtrasados={idsAtrasados}
            vacio={cargando && !datos ? "Cargando…" : "Sin partes"}
          />
        ))}
      </div>
    </div>
  );
}

function Columna({
  titulo,
  dia,
  icono,
  clase,
  tituloClase,
  partes,
  vacio,
  mostrarFecha,
  atrasado,
  idsAtrasados,
}: {
  titulo: string;
  dia?: string;
  icono?: React.ReactNode;
  clase?: string;
  tituloClase?: string;
  partes: ParteTarjeta[];
  vacio: string;
  mostrarFecha?: boolean;
  atrasado?: boolean;
  idsAtrasados?: Set<string>;
}) {
  const muestras = partes.reduce((s, p) => s + p.total, 0);
  return (
    <section
      data-dia={dia}
      className={cn(
        "flex w-[85vw] max-w-sm shrink-0 snap-center flex-col rounded-2xl border bg-background/60",
        clase,
      )}
    >
      <h2 className={cn("flex items-center justify-between gap-2 px-3 pb-2 pt-3 text-sm font-semibold capitalize", tituloClase)}>
        <span className="flex items-center gap-1.5">
          {icono}
          {titulo}
        </span>
        <span className="text-xs font-normal normal-case text-muted-foreground tabular-nums">
          {partes.length} {partes.length === 1 ? "parte" : "partes"} · {muestras} m.
        </span>
      </h2>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {partes.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{vacio}</p>}
        {partes.map((p) => (
          <ParteCard key={p.id} parte={p} mostrarFecha={mostrarFecha} atrasado={atrasado || idsAtrasados?.has(p.id)} />
        ))}
      </div>
    </section>
  );
}

function Chip({ activo, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { activo?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium capitalize",
        activo ? "border-cyan-700 bg-cyan-700 text-white" : "bg-background active:bg-muted",
        className,
      )}
      {...props}
    />
  );
}
