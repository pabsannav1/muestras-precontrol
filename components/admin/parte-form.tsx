"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { EstadoParte, TipoVisita } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, erroresCampos } from "@/lib/cliente-http";
import { ESTADO_PARTE } from "@/lib/ui-estado";
import { TIPO_VISITA } from "@/lib/plan-visitas";
import { ESTADOS_PARTE, TIPOS_VISITA, parteCrearSchema, parteEditarSchema } from "@/lib/validations";
import { ClienteSelector, type ClienteOpcion } from "./cliente-selector";
import { LineasMuestras, lineasParaApi, lineaVacia, type Linea, type Opcion } from "./lineas-muestras";
import { selectClase } from "./ui";

type Tecnico = { id: string; nombre: string };

export type ParteFormDatos = {
  id: string;
  cliente: ClienteOpcion;
  fechaPrevista: string;
  tecnicoId: string | null;
  numPedido: string | null;
  tipoVisita: TipoVisita | null;
  observaciones: string | null;
  estado: EstadoParte;
};

export function ParteForm({
  parte,
  inicial,
  tecnicos,
  tiposAnalisis = [],
  tiposAgua = [],
}: {
  parte?: ParteFormDatos;
  inicial?: { fecha: string; cliente: ClienteOpcion | null; tipoVisita?: TipoVisita | null };
  tecnicos: Tecnico[];
  tiposAnalisis?: Opcion[];
  tiposAgua?: Opcion[];
}) {
  const router = useRouter();
  const editar = !!parte;
  const [cliente, setCliente] = useState<ClienteOpcion | null>(parte?.cliente ?? inicial?.cliente ?? null);
  const [fecha, setFecha] = useState(parte?.fechaPrevista ?? inicial?.fecha ?? "");
  const [tecnicoId, setTecnicoId] = useState(parte?.tecnicoId ?? "");
  const [numPedido, setNumPedido] = useState(parte?.numPedido ?? "");
  const [tipoVisita, setTipoVisita] = useState<TipoVisita | "">(parte?.tipoVisita ?? inicial?.tipoVisita ?? "");
  const [observaciones, setObservaciones] = useState(parte?.observaciones ?? "");
  const [estado, setEstado] = useState<EstadoParte>(parte?.estado ?? "PLANIFICADO");
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia()]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const base = { clienteId: cliente?.id ?? "", fechaPrevista: fecha, tecnicoId: tecnicoId || null, numPedido, tipoVisita: tipoVisita || null, observaciones };
    const cuerpo = editar ? { ...base, estado } : { ...base, lineas: lineasParaApi(lineas) };
    const r = (editar ? parteEditarSchema : parteCrearSchema).safeParse(cuerpo);
    if (!r.success) {
      const errs: Record<string, string> = {};
      for (const i of r.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrores(errs);
      toast.error(errs.lineas ? "Revisa las líneas de muestras" : "Revisa los campos marcados");
      return;
    }
    setGuardando(true);
    try {
      if (editar) {
        await api(`/api/admin/partes/${parte.id}`, "PUT", cuerpo);
        toast.success("Parte guardado");
        router.refresh();
      } else {
        const { parte: p } = await api<{ parte: { id: string; numero: string } }>("/api/admin/partes", "POST", cuerpo);
        toast.success(`Parte ${p.numero} creado`);
        router.push(`/admin/partes/${p.id}`);
      }
    } catch (err) {
      setErrores(erroresCampos(err));
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  const err = (k: string) => errores[k] && <p className="text-xs text-destructive">{errores[k]}</p>;

  return (
    <form onSubmit={guardar} className="space-y-5 rounded-xl border bg-card p-5">
      <div className="grid gap-4 md:grid-cols-6">
        <div className="grid gap-1.5 md:col-span-3">
          <Label>Cliente</Label>
          <ClienteSelector
            valor={cliente}
            onChange={(c) => {
              setCliente(c);
              setErrores((x) => ({ ...x, clienteId: "" }));
            }}
            invalido={!!errores.clienteId}
          />
          {err("clienteId")}
        </div>
        <div className="grid gap-1.5 md:col-span-1">
          <Label htmlFor="fecha">Fecha prevista</Label>
          <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} aria-invalid={!!errores.fechaPrevista} />
          {err("fechaPrevista")}
        </div>
        <div className="grid gap-1.5 md:col-span-2">
          <Label htmlFor="tecnico">Técnico</Label>
          <select id="tecnico" className={selectClase} value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}>
            <option value="">Sin asignar</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          {err("tecnicoId")}
        </div>
        <div className="grid gap-1.5 md:col-span-2">
          <Label htmlFor="pedido">Nº de pedido</Label>
          <Input id="pedido" value={numPedido} onChange={(e) => setNumPedido(e.target.value)} />
        </div>
        <div className="grid gap-1.5 md:col-span-2">
          <Label htmlFor="tipoVisita">Visita del contrato</Label>
          <select
            id="tipoVisita"
            className={selectClase}
            value={tipoVisita}
            onChange={(e) => setTipoVisita(e.target.value as TipoVisita | "")}
          >
            <option value="">Sin clasificar</option>
            {TIPOS_VISITA.map((t) => (
              <option key={t} value={t}>
                {TIPO_VISITA[t].label}
              </option>
            ))}
          </select>
        </div>
        {editar && (
          <div className="grid gap-1.5 md:col-span-2">
            <Label htmlFor="estado">Estado</Label>
            <select id="estado" className={selectClase} value={estado} onChange={(e) => setEstado(e.target.value as EstadoParte)}>
              {ESTADOS_PARTE.map((e) => (
                <option key={e} value={e}>
                  {ESTADO_PARTE[e].label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid gap-1.5 md:col-span-6">
          <Label htmlFor="obs">Observaciones (las ve el técnico)</Label>
          <Textarea id="obs" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </div>
      </div>

      {!editar && (
        <div className="space-y-2">
          <Label>Muestras</Label>
          <LineasMuestras lineas={lineas} onChange={setLineas} tiposAnalisis={tiposAnalisis} tiposAgua={tiposAgua} />
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={guardando}>
          {guardando && <Loader2 className="size-4 animate-spin" />}
          {editar ? "Guardar cambios" : "Crear parte"}
        </Button>
      </div>
    </form>
  );
}
