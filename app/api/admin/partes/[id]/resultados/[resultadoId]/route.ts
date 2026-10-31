import { prisma } from "@/lib/prisma";
import { HttpError, requerirApi } from "@/lib/auth";
import { manejar } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { borrarPdf, leerPdf } from "@/lib/resultados";

type Ctx = { params: Promise<{ id: string; resultadoId: string }> };

async function buscar(ctx: Ctx) {
  const { id, resultadoId } = await ctx.params;
  const r = await prisma.resultadoPdf.findFirst({ where: { id: resultadoId, parteId: id } });
  if (!r) throw new HttpError(404, "Resultado no encontrado");
  return r;
}

/** Descarga / visualiza el PDF. */
export async function GET(_req: Request, ctx: Ctx) {
  return manejar(async () => {
    await requerirApi("ADMIN");
    const r = await buscar(ctx);
    const datos = await leerPdf(r.ruta).catch(() => {
      throw new HttpError(404, "Archivo no encontrado en el servidor");
    });
    return new Response(new Uint8Array(datos), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(r.nombre)}`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return manejar(async () => {
    const u = await requerirApi("ADMIN");
    const r = await buscar(ctx);
    await prisma.$transaction(async (tx) => {
      await tx.resultadoPdf.delete({ where: { id: r.id } });
      await auditar(tx, { usuarioId: u.id, entidad: "Parte", entidadId: r.parteId, accion: "BORRAR_RESULTADOS", cambios: { archivo: r.nombre } });
    });
    await borrarPdf(r.ruta);
    return { ok: true };
  });
}
