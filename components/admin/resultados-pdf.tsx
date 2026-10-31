"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, FileText, Loader2, RefreshCw, Sparkles, Trash2, Upload } from "lucide-react";
import type { EstadoIA } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { api, ErrorApi } from "@/lib/cliente-http";
import { cn } from "@/lib/utils";

type Parametro = { muestra: string; parametro: string; valor: string; unidad: string; enRojo: boolean };

export type ResultadoFila = {
  id: string;
  nombre: string;
  tamano: number;
  subidoEn: Date;
  estadoIA: EstadoIA;
  analisis: string | null;
  hayRojos: boolean;
  error: string | null;
};

const fmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" });

function leerAnalisis(a: string | null): { resumen: string; parametros: Parametro[] } | null {
  if (!a) return null;
  try {
    return JSON.parse(a);
  } catch {
    return null;
  }
}

export function ResultadosPdf({
  parteId,
  resultados,
  atencion,
  iaConfigurada,
}: {
  parteId: string;
  resultados: ResultadoFila[];
  atencion: boolean;
  iaConfigurada: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function subir(archivos: FileList | File[]) {
    const pdfs = [...archivos].filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!pdfs.length) return toast.error("Arrastra un archivo PDF");
    setSubiendo(true);
    try {
      for (const f of pdfs) {
        const fd = new FormData();
        fd.append("archivo", f);
        const res = await fetch(`/api/admin/partes/${parteId}/resultados`, { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new ErrorApi(data.error ?? `Error ${res.status}`);
        const r = data.resultado as ResultadoFila;
        if (r.estadoIA === "SIN_CLAVE") toast.info(`${f.name} guardado. Pendiente de leer: falta configurar la IA.`);
        else if (r.estadoIA === "ERROR") toast.error(`${f.name}: la IA no pudo leerlo (${r.error})`);
        else if (r.hayRojos) toast.warning(`${f.name}: hay parámetros en rojo. Parte marcado como ATENCIÓN.`, { duration: 10000 });
        else toast.success(`${f.name}: leído, sin parámetros en rojo`);
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setSubiendo(false);
    }
  }

  async function reanalizar(r: ResultadoFila) {
    setOcupado(r.id);
    try {
      const { resultado } = await api<{ resultado: ResultadoFila }>(`/api/admin/partes/${parteId}/resultados/${r.id}/analizar`, "POST");
      if (resultado.estadoIA === "ERROR") toast.error(`La IA no pudo leerlo (${resultado.error})`);
      else if (resultado.hayRojos) toast.warning("Hay parámetros en rojo. Parte marcado como ATENCIÓN.");
      else toast.success("Leído, sin parámetros en rojo");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setOcupado(null);
    }
  }

  async function borrar(r: ResultadoFila) {
    if (!confirm(`¿Quitar el PDF ${r.nombre}?`)) return;
    setOcupado(r.id);
    try {
      await api(`/api/admin/partes/${parteId}/resultados/${r.id}`, "DELETE");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setOcupado(null);
    }
  }

  async function cambiarAtencion(valor: boolean) {
    try {
      await api(`/api/admin/partes/${parteId}/atencion`, "PUT", { atencion: valor });
      toast.success(valor ? "Parte marcado como ATENCIÓN" : "Marca de atención quitada");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="space-y-3">
      {atencion && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-red-500 bg-red-50 px-4 py-3 text-red-900">
          <AlertTriangle className="size-5 text-red-600" />
          <div className="flex-1 text-sm">
            <p className="font-bold">ATENCIÓN: hay resultados en rojo pendientes de revisar.</p>
          </div>
          <Button size="sm" variant="outline" className="border-red-300 bg-white" onClick={() => cambiarAtencion(false)}>
            <CheckCircle2 className="size-4" /> Marcar como revisado
          </Button>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setEncima(false);
          if (!subiendo) subir(e.dataTransfer.files);
        }}
        onClick={() => !subiendo && input.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground transition",
          encima && "border-cyan-600 bg-cyan-50 text-cyan-900",
        )}
      >
        {subiendo ? <Loader2 className="size-6 animate-spin" /> : <Upload className="size-6" />}
        <p className="font-medium text-foreground">
          {subiendo ? (iaConfigurada ? "Subiendo y leyendo con IA…" : "Subiendo…") : "Arrastra aquí el PDF de resultados del laboratorio"}
        </p>
        <p className="text-xs">
          o haz clic para elegirlo ·{" "}
          {iaConfigurada ? (
            <span className="inline-flex items-center gap-1">
              <Sparkles className="size-3" /> Gemini lo leerá y marcará ATENCIÓN si algún parámetro sale en rojo
            </span>
          ) : (
            <span className="text-amber-700">IA sin configurar: el PDF se guarda y podrás leerlo cuando añadas GEMINI_API_KEY</span>
          )}
        </p>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) subir(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {resultados.map((r) => {
        const a = leerAnalisis(r.analisis);
        return (
          <div key={r.id} className={cn("rounded-xl border bg-card", r.hayRojos && "border-red-400")}>
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
              <FileText className="size-4 text-muted-foreground" />
              <a
                href={`/api/admin/partes/${parteId}/resultados/${r.id}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium hover:underline"
              >
                {r.nombre}
              </a>
              <span className="text-xs text-muted-foreground">
                {fmt.format(new Date(r.subidoEn))} · {(r.tamano / 1024).toFixed(0)} KB
              </span>
              <EstadoLectura r={r} />
              <div className="ml-auto flex gap-1">
                {iaConfigurada && (
                  <Button size="sm" variant="ghost" disabled={ocupado === r.id} onClick={() => reanalizar(r)}>
                    {ocupado === r.id ? <Loader2 className="size-4 animate-spin" /> : r.estadoIA === "OK" ? <RefreshCw className="size-4" /> : <Sparkles className="size-4" />}
                    {r.estadoIA === "OK" ? "Releer" : "Leer con IA"}
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-destructive" disabled={ocupado === r.id} onClick={() => borrar(r)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {r.estadoIA === "ERROR" && <p className="px-4 py-2 text-xs text-destructive">{r.error}</p>}
            {a && (
              <div className="space-y-2 px-4 py-3">
                {a.resumen && <p className="text-sm">{a.resumen}</p>}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="py-1 pr-3 font-medium">Muestra</th>
                        <th className="py-1 pr-3 font-medium">Parámetro</th>
                        <th className="py-1 pr-3 font-medium">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.parametros.map((p, i) => (
                        <tr key={i} className={cn("border-t", p.enRojo && "bg-red-50 font-semibold text-red-700")}>
                          <td className="py-1 pr-3">{p.muestra}</td>
                          <td className="py-1 pr-3">{p.parametro}</td>
                          <td className="py-1 pr-3">
                            {p.valor} {p.unidad}
                            {p.enRojo && <AlertTriangle className="ml-1 inline size-3" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!atencion && resultados.length > 0 && (
        <button type="button" onClick={() => cambiarAtencion(true)} className="text-xs text-muted-foreground hover:text-red-700 hover:underline">
          Marcar manualmente como ATENCIÓN
        </button>
      )}
    </div>
  );
}

function EstadoLectura({ r }: { r: ResultadoFila }) {
  if (r.estadoIA === "SIN_CLAVE")
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Pendiente de leer</span>;
  if (r.estadoIA === "ERROR") return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Error de lectura</span>;
  return r.hayRojos ? (
    <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">Parámetros en rojo</span>
  ) : (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Sin rojos</span>
  );
}
