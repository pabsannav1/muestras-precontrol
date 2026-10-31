import { prisma } from "@/lib/prisma";
import { HttpError, requerirApi } from "@/lib/auth";
import { manejar } from "@/lib/api";
import { analizarPdf, iaConfigurada, leerPdf } from "@/lib/resultados";

export const maxDuration = 300;

/** Vuelve a leer con Gemini un PDF ya subido (p. ej. tras configurar la clave). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; resultadoId: string }> }) {
  return manejar(async () => {
    await requerirApi("ADMIN");
    const { id, resultadoId } = await params;
    if (!iaConfigurada()) throw new HttpError(409, "Falta configurar GEMINI_API_KEY en el servidor");
    const r = await prisma.resultadoPdf.findFirst({ where: { id: resultadoId, parteId: id } });
    if (!r) throw new HttpError(404, "Resultado no encontrado");
    const ia = await analizarPdf(await leerPdf(r.ruta));
    const resultado = await prisma.$transaction(async (tx) => {
      const n = await tx.resultadoPdf.update({ where: { id: r.id }, data: ia });
      if (ia.hayRojos) await tx.parte.update({ where: { id }, data: { atencion: true } });
      return n;
    });
    return { resultado };
  });
}
