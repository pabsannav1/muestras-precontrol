import { prisma } from "@/lib/prisma";
import { HttpError, requerirApi } from "@/lib/auth";
import { leerJson, manejar } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { recalcularEstadoParte } from "@/lib/estado";
import { comprobarTipos, crearMuestras } from "@/lib/admin";
import { muestrasCrearSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return manejar(async () => {
    await requerirApi("ADMIN");
    const { id } = await params;
    const muestras = await prisma.muestra.findMany({
      where: { parteId: id },
      orderBy: { orden: "asc" },
      include: { tipoAnalisis: { select: { nombre: true } }, tipoAgua: { select: { nombre: true } } },
    });
    return { muestras };
  });
}

/** Añade "N × tipo de análisis · tipo de agua" por cada línea. */
export async function POST(req: Request, { params }: Ctx) {
  return manejar(async () => {
    const u = await requerirApi("ADMIN");
    const { id } = await params;
    const { lineas } = muestrasCrearSchema.parse(await leerJson(req));
    const parte = await prisma.parte.findUnique({ where: { id }, select: { estado: true } });
    if (!parte) throw new HttpError(404, "Parte no encontrado");
    await comprobarTipos(lineas);

    const creadas = await prisma.$transaction(async (tx) => {
      const n = await crearMuestras(tx, id, lineas);
      // Muestras nuevas reabren un parte completado
      if (parte.estado === "COMPLETADO") await tx.parte.update({ where: { id }, data: { estado: "EN_CURSO" } });
      await auditar(tx, { usuarioId: u.id, entidad: "Parte", entidadId: id, accion: "AÑADIR_MUESTRAS", cambios: { lineas, creadas: n } });
      await recalcularEstadoParte(tx, id);
      return n;
    });
    return { creadas };
  });
}
