import { prisma } from "@/lib/prisma";
import { HttpError, requerirApi } from "@/lib/auth";
import { manejar } from "@/lib/api";
import { auditar } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    const u = await requerirApi("ADMIN");
    const { id } = await params;
    const p = await prisma.parte.findUnique({ where: { id }, select: { estado: true } });
    if (!p) throw new HttpError(404, "Parte no encontrado");
    if (p.estado !== "COMPLETADO") throw new HttpError(409, "Solo se pueden validar partes completados");
    await prisma.$transaction(async (tx) => {
      await tx.parte.update({ where: { id }, data: { estado: "VALIDADO" } });
      await auditar(tx, { usuarioId: u.id, entidad: "Parte", entidadId: id, accion: "VALIDAR" });
    });
    return { estado: "VALIDADO" };
  });
}
