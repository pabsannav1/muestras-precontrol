import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError, requerirApi } from "@/lib/auth";
import { leerJson, manejar } from "@/lib/api";
import { auditar } from "@/lib/audit";

/** Marca o quita la marca de ATENCIÓN (p. ej. tras revisar los resultados en rojo). */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    const u = await requerirApi("ADMIN");
    const { id } = await params;
    const { atencion } = z.object({ atencion: z.boolean() }).parse(await leerJson(req));
    const p = await prisma.parte.findUnique({ where: { id }, select: { atencion: true } });
    if (!p) throw new HttpError(404, "Parte no encontrado");
    await prisma.$transaction(async (tx) => {
      await tx.parte.update({ where: { id }, data: { atencion } });
      await auditar(tx, { usuarioId: u.id, entidad: "Parte", entidadId: id, accion: atencion ? "MARCAR_ATENCION" : "QUITAR_ATENCION" });
    });
    return { atencion };
  });
}
