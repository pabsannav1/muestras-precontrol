import { prisma } from "@/lib/prisma";
import { requerirApi } from "@/lib/auth";
import { leerJson, manejar } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { comprobarRelacionesParte } from "@/lib/admin";
import { partesBloqueSchema } from "@/lib/validations";

/** Acciones sobre varios partes: cambiar técnico o validar. */
export async function POST(req: Request) {
  return manejar(async () => {
    const u = await requerirApi("ADMIN");
    const d = partesBloqueSchema.parse(await leerJson(req));

    if (d.accion === "asignar") {
      if (d.tecnicoId) {
        const algun = await prisma.parte.findFirst({ where: { id: { in: d.ids } }, select: { clienteId: true } });
        if (algun) await comprobarRelacionesParte({ clienteId: algun.clienteId, tecnicoId: d.tecnicoId });
      }
      const n = await prisma.$transaction(async (tx) => {
        const editables = await tx.parte.findMany({
          where: { id: { in: d.ids }, estado: { notIn: ["VALIDADO", "CANCELADO"] } },
          select: { id: true, tecnicoId: true },
        });
        await tx.parte.updateMany({ where: { id: { in: editables.map((p) => p.id) } }, data: { tecnicoId: d.tecnicoId } });
        for (const p of editables)
          await auditar(tx, {
            usuarioId: u.id,
            entidad: "Parte",
            entidadId: p.id,
            accion: "ASIGNAR_BLOQUE",
            cambios: { tecnicoId: { antes: p.tecnicoId, despues: d.tecnicoId } },
          });
        return editables.length;
      });
      return { actualizados: n, omitidos: d.ids.length - n };
    }

    const n = await prisma.$transaction(async (tx) => {
      const validables = await tx.parte.findMany({ where: { id: { in: d.ids }, estado: "COMPLETADO" }, select: { id: true } });
      await tx.parte.updateMany({ where: { id: { in: validables.map((p) => p.id) } }, data: { estado: "VALIDADO" } });
      for (const p of validables) await auditar(tx, { usuarioId: u.id, entidad: "Parte", entidadId: p.id, accion: "VALIDAR" });
      return validables.length;
    });
    return { actualizados: n, omitidos: d.ids.length - n };
  });
}
