import { notFound } from "next/navigation";
import { requerirPagina } from "@/lib/auth";
import { parteDetalle, sugerenciasPuntos } from "@/lib/partes";
import { ESTADOS_EDITABLES_TECNICO } from "@/lib/estado";
import { horaActual, hoyKey } from "@/lib/fechas";
import { valoresDesdeMuestra } from "@/lib/muestra-campos";
import { MuestraForm } from "@/components/tecnico/muestra-form";

export const metadata = { title: "Muestra" };

export default async function MuestraPage({ params }: { params: Promise<{ id: string; muestraId: string }> }) {
  const u = await requerirPagina("TECNICO");
  const { id, muestraId } = await params;
  const parte = await parteDetalle(id);
  if (!parte || parte.tecnicoId !== u.id) notFound();

  const i = parte.muestras.findIndex((m) => m.id === muestraId);
  if (i < 0) notFound();
  const m = parte.muestras[i];

  // Siguiente: la próxima pendiente después de esta; si no, la primera pendiente anterior
  const resto = [...parte.muestras.slice(i + 1), ...parte.muestras.slice(0, i)];
  const siguiente = resto.find((x) => x.estado === "PENDIENTE") ?? null;

  return (
    <MuestraForm
      parteId={parte.id}
      cliente={parte.cliente.nombre}
      muestra={{
        id: m.id,
        referencia: m.referencia,
        tipoAnalisis: m.tipoAnalisis.nombre,
        tipoAgua: m.tipoAgua.nombre,
        estado: m.estado,
      }}
      inicial={valoresDesdeMuestra(m, { fecha: hoyKey(), hora: horaActual() })}
      sugerencias={await sugerenciasPuntos(parte.cliente.id)}
      siguiente={siguiente ? { id: siguiente.id, referencia: siguiente.referencia } : null}
      editable={ESTADOS_EDITABLES_TECNICO.includes(parte.estado)}
      posicion={{ actual: i + 1, total: parte.muestras.length }}
    />
  );
}
