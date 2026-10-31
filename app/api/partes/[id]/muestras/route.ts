import { prisma } from "@/lib/prisma";
import { requerirApi, HttpError } from "@/lib/auth";
import { leerJson, manejar } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { recalcularEstadoParte } from "@/lib/estado";
import { referenciaMuestra, siguienteOrdenMuestra } from "@/lib/numeracion";
import { comprobarEditable } from "@/lib/partes";
import { muestraExtraSchema } from "@/lib/validations";

/** Muestra extra añadida en campo por el técnico. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    const u = await requerirApi();
    const { id } = await params;
    const datos = muestraExtraSchema.parse(await leerJson(req));

    const parte = await prisma.parte.findUnique({ where: { id }, select: { id: true, tecnicoId: true, estado: true } });
    if (!parte) throw new HttpError(404, "Parte no encontrado");
    comprobarEditable(u, parte);

    const [ta, tg] = await Promise.all([
      prisma.tipoAnalisis.findFirst({ where: { id: datos.tipoAnalisisId, activo: true } }),
      prisma.tipoAgua.findFirst({ where: { id: datos.tipoAguaId, activo: true } }),
    ]);
    if (!ta || !tg) throw new HttpError(400, "Tipo de análisis o de agua no válido");

    const muestra = await prisma.$transaction(async (tx) => {
      const orden = await siguienteOrdenMuestra(tx, id);
      const m = await tx.muestra.create({
        data: { parteId: id, orden, referencia: referenciaMuestra(orden), ...datos },
        select: { id: true, referencia: true },
      });
      // Una muestra nueva reabre un parte completado
      if (parte.estado === "COMPLETADO") await tx.parte.update({ where: { id }, data: { estado: "EN_CURSO" } });
      await auditar(tx, {
        usuarioId: u.id,
        entidad: "Muestra",
        entidadId: m.id,
        accion: "CREAR_EXTRA",
        cambios: { parteId: id, referencia: m.referencia, tipoAnalisis: ta.nombre, tipoAgua: tg.nombre },
      });
      await recalcularEstadoParte(tx, id);
      return m;
    });
    return { muestra };
  });
}
