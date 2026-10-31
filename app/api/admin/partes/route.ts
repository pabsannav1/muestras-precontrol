import { prisma } from "@/lib/prisma";
import { requerirApi } from "@/lib/auth";
import { leerJson, manejar } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { keyToDate } from "@/lib/fechas";
import { comprobarRelacionesParte, comprobarTipos, crearMuestras, nuevoNumeroParte } from "@/lib/admin";
import { listarPartes } from "@/lib/admin-partes";
import { parteCrearSchema } from "@/lib/validations";

export async function GET(req: Request) {
  return manejar(async () => {
    await requerirApi("ADMIN");
    const sp = new URL(req.url).searchParams;
    const pagina = Math.max(1, Number(sp.get("pagina")) || 1);
    return listarPartes(
      {
        q: sp.get("q") ?? undefined,
        estado: sp.get("estado") ?? undefined,
        tecnicoId: sp.get("tecnicoId") ?? undefined,
        clienteId: sp.get("clienteId") ?? undefined,
        desde: sp.get("desde") ?? undefined,
        hasta: sp.get("hasta") ?? undefined,
      },
      pagina,
    );
  });
}

export async function POST(req: Request) {
  return manejar(async () => {
    const u = await requerirApi("ADMIN");
    const { lineas, ...d } = parteCrearSchema.parse(await leerJson(req));
    await comprobarRelacionesParte(d);
    if (lineas.length) await comprobarTipos(lineas);

    const parte = await prisma.$transaction(async (tx) => {
      const numero = await nuevoNumeroParte(tx, d.fechaPrevista);
      const p = await tx.parte.create({
        data: { ...d, numero, fechaPrevista: keyToDate(d.fechaPrevista), creadoPorId: u.id },
        select: { id: true, numero: true },
      });
      const n = await crearMuestras(tx, p.id, lineas);
      await auditar(tx, { usuarioId: u.id, entidad: "Parte", entidadId: p.id, accion: "CREAR", cambios: { ...d, numero, muestras: n } });
      return p;
    });
    return { parte };
  });
}
