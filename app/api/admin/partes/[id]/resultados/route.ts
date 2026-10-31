import { prisma } from "@/lib/prisma";
import { HttpError, requerirApi } from "@/lib/auth";
import { manejar } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { MAX_PDF, analizarPdf, guardarPdf } from "@/lib/resultados";

export const maxDuration = 300;

/** Sube el PDF de resultados del laboratorio y lo lee con Gemini (si hay clave). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    const u = await requerirApi("ADMIN");
    const { id } = await params;
    const parte = await prisma.parte.findUnique({ where: { id }, select: { id: true } });
    if (!parte) throw new HttpError(404, "Parte no encontrado");

    const form = await req.formData().catch(() => null);
    const archivo = form?.get("archivo");
    if (!(archivo instanceof File)) throw new HttpError(400, "Falta el archivo");
    if (archivo.size > MAX_PDF) throw new HttpError(413, "El PDF supera 15 MB");
    const datos = Buffer.from(await archivo.arrayBuffer());
    if (datos.subarray(0, 5).toString("latin1") !== "%PDF-") throw new HttpError(400, "El archivo no es un PDF");

    const ruta = await guardarPdf(id, datos);
    const ia = await analizarPdf(datos);
    const resultado = await prisma.$transaction(async (tx) => {
      const r = await tx.resultadoPdf.create({
        data: { parteId: id, nombre: archivo.name.slice(0, 200) || "resultados.pdf", ruta, tamano: datos.length, ...ia },
      });
      if (ia.hayRojos) await tx.parte.update({ where: { id }, data: { atencion: true } });
      await auditar(tx, {
        usuarioId: u.id,
        entidad: "Parte",
        entidadId: id,
        accion: "SUBIR_RESULTADOS",
        cambios: { archivo: r.nombre, estadoIA: ia.estadoIA, hayRojos: ia.hayRojos },
      });
      return r;
    });
    return { resultado };
  });
}
