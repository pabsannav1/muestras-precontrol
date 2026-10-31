import type { Prisma } from "@prisma/client";
import { contiene, prisma } from "@/lib/prisma";
import { requerirApi } from "@/lib/auth";
import { leerJson, manejar } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { clienteSchema } from "@/lib/validations";
import { datosCliente } from "@/lib/admin";

export async function GET(req: Request) {
  return manejar(async () => {
    await requerirApi("ADMIN");
    const sp = new URL(req.url).searchParams;
    const q = sp.get("q")?.trim();
    const limite = Math.min(Number(sp.get("limite")) || 50, 500);
    const where: Prisma.ClienteWhereInput = {
      ...(sp.get("activo") === "1" && { activo: true }),
      ...(q && {
        OR: [{ nombre: contiene(q) }, { codigo: contiene(q) }, { poblacion: contiene(q) }],
      }),
    };
    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: [{ nombre: "asc" }],
      take: limite,
      select: { id: true, codigo: true, nombre: true, poblacion: true, activo: true },
    });
    return { clientes };
  });
}

export async function POST(req: Request) {
  return manejar(async () => {
    const u = await requerirApi("ADMIN");
    const data = datosCliente(clienteSchema.parse(await leerJson(req)));
    const cliente = await prisma.$transaction(async (tx) => {
      const c = await tx.cliente.create({ data });
      await auditar(tx, { usuarioId: u.id, entidad: "Cliente", entidadId: c.id, accion: "CREAR", cambios: data });
      return c;
    });
    return { cliente };
  });
}
