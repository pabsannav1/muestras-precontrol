import { prisma } from "@/lib/prisma";
import { requerirApi, HttpError } from "@/lib/auth";
import { manejar } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { comprobarEditable } from "@/lib/partes";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    const u = await requerirApi();
    const { id } = await params;
    const parte = await prisma.parte.findUnique({
      where: { id },
      select: { id: true, tecnicoId: true, estado: true, _count: { select: { muestras: { where: { estado: "PENDIENTE" } } } } },
    });
    if (!parte) throw new HttpError(404, "Parte no encontrado");
    comprobarEditable(u, parte);
    if (parte.estado === "COMPLETADO") return { estado: parte.estado };

    await prisma.$transaction(async (tx) => {
      await tx.parte.update({ where: { id }, data: { estado: "COMPLETADO" } });
      await auditar(tx, {
        usuarioId: u.id,
        entidad: "Parte",
        entidadId: id,
        accion: "CERRAR",
        cambios: { estado: { antes: parte.estado, despues: "COMPLETADO" }, pendientes: parte._count.muestras },
      });
    });
    return { estado: "COMPLETADO" };
  });
}
