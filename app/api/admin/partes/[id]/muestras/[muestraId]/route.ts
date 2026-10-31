import { prisma } from "@/lib/prisma";
import { HttpError, requerirApi } from "@/lib/auth";
import { leerJson, manejar } from "@/lib/api";
import { auditar, diferencias } from "@/lib/audit";
import { muestraTomada, recalcularEstadoParte } from "@/lib/estado";
import { keyToDate } from "@/lib/fechas";
import { comprobarTipos, renumerarMuestras } from "@/lib/admin";
import { muestraAdminSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ id: string; muestraId: string }> };

async function cargar(parteId: string, muestraId: string) {
  const m = await prisma.muestra.findUnique({ where: { id: muestraId }, include: { parte: { select: { estado: true } } } });
  if (!m || m.parteId !== parteId) throw new HttpError(404, "Muestra no encontrada");
  return m;
}

/** El admin cambia tipos y corrige datos. Fecha/hora no se rellenan solas aquí. */
export async function PUT(req: Request, { params }: Ctx) {
  return manejar(async () => {
    const u = await requerirApi("ADMIN");
    const { id, muestraId } = await params;
    const d = muestraAdminSchema.parse(await leerJson(req));
    const antes = await cargar(id, muestraId);
    await comprobarTipos([d]);

    const tomada = muestraTomada(d);
    const data = {
      ...d,
      fechaToma: d.fechaToma ? keyToDate(d.fechaToma) : null,
      estado: tomada ? ("TOMADA" as const) : ("PENDIENTE" as const),
      ...(tomada && antes.estado !== "TOMADA" && { tomadaEn: new Date() }),
      ...(!tomada && { tomadaPorId: null, tomadaEn: null }),
    };
    await prisma.$transaction(async (tx) => {
      await tx.muestra.update({ where: { id: muestraId }, data });
      const dif = diferencias(antes as unknown as Record<string, unknown>, data);
      if (Object.keys(dif).length)
        await auditar(tx, { usuarioId: u.id, entidad: "Muestra", entidadId: muestraId, accion: "EDITAR_ADMIN", cambios: dif });
      await recalcularEstadoParte(tx, id);
    });
    return { ok: true };
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return manejar(async () => {
    const u = await requerirApi("ADMIN");
    const { id, muestraId } = await params;
    const m = await cargar(id, muestraId);
    await prisma.$transaction(async (tx) => {
      await tx.muestra.delete({ where: { id: muestraId } });
      if (m.parte.estado === "PLANIFICADO") await renumerarMuestras(tx, id);
      await auditar(tx, {
        usuarioId: u.id,
        entidad: "Muestra",
        entidadId: muestraId,
        accion: "BORRAR",
        cambios: { parteId: id, referencia: m.referencia, estado: m.estado, puntoRecogida: m.puntoRecogida },
      });
      await recalcularEstadoParte(tx, id);
    });
    return { ok: true };
  });
}
