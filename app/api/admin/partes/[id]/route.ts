import { prisma } from "@/lib/prisma";
import { HttpError, requerirApi } from "@/lib/auth";
import { leerJson, manejar } from "@/lib/api";
import { auditar, diferencias } from "@/lib/audit";
import { keyToDate } from "@/lib/fechas";
import { comprobarRelacionesParte } from "@/lib/admin";
import { parteAdmin } from "@/lib/admin-partes";
import { parteEditarSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return manejar(async () => {
    await requerirApi("ADMIN");
    const { id } = await params;
    const parte = await parteAdmin(id);
    if (!parte) throw new HttpError(404, "Parte no encontrado");
    return { parte };
  });
}

export async function PUT(req: Request, { params }: Ctx) {
  return manejar(async () => {
    const u = await requerirApi("ADMIN");
    const { id } = await params;
    const d = parteEditarSchema.parse(await leerJson(req));
    const antes = await prisma.parte.findUnique({ where: { id } });
    if (!antes) throw new HttpError(404, "Parte no encontrado");
    // Un técnico ya asignado aunque esté inactivo no bloquea la edición
    if (d.tecnicoId !== antes.tecnicoId || d.clienteId !== antes.clienteId) await comprobarRelacionesParte(d);

    const data = { ...d, fechaPrevista: keyToDate(d.fechaPrevista) };
    const parte = await prisma.$transaction(async (tx) => {
      const p = await tx.parte.update({ where: { id }, data, select: { id: true, estado: true } });
      const dif = diferencias(antes, data);
      if (Object.keys(dif).length) await auditar(tx, { usuarioId: u.id, entidad: "Parte", entidadId: id, accion: "EDITAR", cambios: dif });
      return p;
    });
    return { parte };
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return manejar(async () => {
    const u = await requerirApi("ADMIN");
    const { id } = await params;
    const p = await prisma.parte.findUnique({ where: { id }, select: { numero: true, _count: { select: { muestras: true } } } });
    if (!p) throw new HttpError(404, "Parte no encontrado");
    await prisma.$transaction(async (tx) => {
      await tx.parte.delete({ where: { id } }); // las muestras se borran en cascada
      await auditar(tx, { usuarioId: u.id, entidad: "Parte", entidadId: id, accion: "BORRAR", cambios: { numero: p.numero, muestras: p._count.muestras } });
    });
    return { ok: true };
  });
}
