import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { parteAdmin } from "@/lib/admin-partes";
import { tecnicosActivos } from "@/lib/admin";
import { catalogosActivos } from "@/lib/partes";
import { dateToKey } from "@/lib/fechas";
import { resumenMuestras } from "@/lib/resumen";
import { EstadoBadge } from "@/components/estado-badge";
import { ParteForm } from "@/components/admin/parte-form";
import { MuestrasAdmin } from "@/components/admin/muestras-admin";
import { AccionesParteAdmin } from "@/components/admin/acciones-parte-admin";
import { AtencionBadge } from "@/components/admin/tabla-partes";
import { CorreoAdministracion } from "@/components/admin/correo-administracion";
import { ResultadosPdf } from "@/components/admin/resultados-pdf";
import { correoMuestras } from "@/lib/correo";
import { iaConfigurada } from "@/lib/resultados";
import { TIPO_VISITA } from "@/lib/plan-visitas";

export const metadata = { title: "Parte" };

const fmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short", timeZone: process.env.APP_TZ || "Europe/Madrid" });

export default async function EditarPartePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [parte, tecnicosAct, catalogos] = await Promise.all([parteAdmin(id), tecnicosActivos(), catalogosActivos()]);
  if (!parte) notFound();

  // Mantener en la lista al técnico asignado aunque esté inactivo
  const tecnicos =
    parte.tecnico && !tecnicosAct.some((t) => t.id === parte.tecnico!.id)
      ? [...tecnicosAct, { ...parte.tecnico, nombre: `${parte.tecnico.nombre} (inactivo)` }]
      : tecnicosAct;
  const tomadas = parte.muestras.filter((m) => m.estado === "TOMADA").length;
  const correo = parte.estado === "VALIDADO" ? correoMuestras(parte) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/admin/partes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Partes
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">
            <span className="font-mono">{parte.numero}</span> · {parte.cliente.nombre}
          </h1>
          <EstadoBadge estado={parte.estado} />
          {parte.atencion && <AtencionBadge className="text-sm" />}
          {parte.tipoVisita && (
            <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">{TIPO_VISITA[parte.tipoVisita].label}</span>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            {correo && <CorreoAdministracion {...correo} />}
            <AccionesParteAdmin parteId={parte.id} numero={parte.numero} estado={parte.estado} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Creado por {parte.creadoPor.nombre} el {fmt.format(parte.creadoEn)} · Última modificación {fmt.format(parte.actualizadoEn)} ·{" "}
          <Link href={`/admin/clientes/${parte.cliente.id}`} className="hover:underline">
            Ver cliente
          </Link>
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Resultados del laboratorio</h2>
        <ResultadosPdf parteId={parte.id} resultados={parte.resultados} atencion={parte.atencion} iaConfigurada={iaConfigurada()} />
      </section>

      <ParteForm
        key={parte.actualizadoEn.toISOString()}
        parte={{
          id: parte.id,
          cliente: parte.cliente,
          fechaPrevista: dateToKey(parte.fechaPrevista),
          tecnicoId: parte.tecnicoId,
          numPedido: parte.numPedido,
          tipoVisita: parte.tipoVisita,
          observaciones: parte.observaciones,
          estado: parte.estado,
        }}
        tecnicos={tecnicos}
      />

      <section className="space-y-3">
        <h2 className="flex items-baseline gap-3 text-lg font-semibold">
          Muestras
          <span className="text-sm font-normal text-muted-foreground">
            {tomadas}/{parte.muestras.length} tomadas · {resumenMuestras(parte.muestras)}
          </span>
        </h2>
        <MuestrasAdmin
          parteId={parte.id}
          planificado={parte.estado === "PLANIFICADO"}
          muestras={parte.muestras}
          {...catalogos}
        />
      </section>
    </div>
  );
}
