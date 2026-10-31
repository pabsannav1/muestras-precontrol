import { prisma } from "@/lib/prisma";
import { HttpError, requerirApi } from "@/lib/auth";
import { leerJson, manejar } from "@/lib/api";
import { auditar, diferencias } from "@/lib/audit";
import { clienteSchema } from "@/lib/validations";
import { datosCliente } from "@/lib/admin";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return manejar(async () => {
    await requerirApi("ADMIN");
    const { id } = await params;
    const cliente = await prisma.cliente.findUnique({ where: { id } });
    if (!cliente) throw new HttpError(404, "Cliente no encontrado");
    return { cliente };
  });
}

export async function PUT(req: Request, { params }: Ctx) {
  return manejar(async () => {
    const u = await requerirApi("ADMIN");
    const { id } = await params;
    const data = datosCliente(clienteSchema.parse(await leerJson(req)));
    const antes = await prisma.cliente.findUnique({ where: { id } });
    if (!antes) throw new HttpError(404, "Cliente no encontrado");
    const cliente = await prisma.$transaction(async (tx) => {
      const c = await tx.cliente.update({ where: { id }, data });
      const dif = diferencias(antes, data);
      if (Object.keys(dif).length) await auditar(tx, { usuarioId: u.id, entidad: "Cliente", entidadId: id, accion: "EDITAR", cambios: dif });
      return c;
    });
    return { cliente };
  });
}

/** Borra el cliente solo si no tiene partes; si los tiene, hay que desactivarlo. */
export async function DELETE(_req: Request, { params }: Ctx) {
  return manejar(async () => {
    const u = await requerirApi("ADMIN");
    const { id } = await params;
    const c = await prisma.cliente.findUnique({ where: { id }, select: { nombre: true, _count: { select: { partes: true } } } });
    if (!c) throw new HttpError(404, "Cliente no encontrado");
    if (c._count.partes > 0) throw new HttpError(409, `Tiene ${c._count.partes} partes. Desactívalo en lugar de borrarlo.`);
    await prisma.$transaction(async (tx) => {
      await tx.cliente.delete({ where: { id } });
      await auditar(tx, { usuarioId: u.id, entidad: "Cliente", entidadId: id, accion: "BORRAR", cambios: { nombre: c.nombre } });
    });
    return { ok: true };
  });
}
