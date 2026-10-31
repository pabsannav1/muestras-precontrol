import { prisma } from "@/lib/prisma";
import { requerirApi, HttpError } from "@/lib/auth";
import { leerJson, manejar } from "@/lib/api";
import { auditar, diferencias } from "@/lib/audit";
import { muestraTomada, recalcularEstadoParte } from "@/lib/estado";
import { horaActual, hoyKey, keyToDate } from "@/lib/fechas";
import { comprobarEditable, selectMuestra } from "@/lib/partes";
import { muestraDatosSchema } from "@/lib/validations";

/** El técnico rellena/edita los datos de una muestra. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    const u = await requerirApi();
    const { id } = await params;
    const datos = muestraDatosSchema.parse(await leerJson(req));

    const actual = await prisma.muestra.findUnique({
      where: { id },
      include: { parte: { select: { id: true, tecnicoId: true, estado: true } } },
    });
    if (!actual) throw new HttpError(404, "Muestra no encontrada");
    comprobarEditable(u, actual.parte);

    const tomada = muestraTomada(datos);
    const cambios = {
      puntoRecogida: datos.puntoRecogida,
      temperatura: datos.temperatura,
      temperaturaAC: datos.temperaturaAC,
      cloro: datos.cloro,
      conductividad: datos.conductividad,
      ph: datos.ph,
      hierro: datos.hierro,
      observaciones: datos.observaciones,
      // Fecha y hora de toma por defecto: hoy y ahora
      fechaToma: keyToDate(datos.fechaToma ?? hoyKey()),
      horaToma: datos.horaToma ?? horaActual(),
      estado: tomada ? ("TOMADA" as const) : ("PENDIENTE" as const),
      ...(tomada && actual.estado !== "TOMADA" && { tomadaPorId: u.id, tomadaEn: new Date() }),
      ...(!tomada && { tomadaPorId: null, tomadaEn: null }),
    };

    const res = await prisma.$transaction(async (tx) => {
      const m = await tx.muestra.update({ where: { id }, data: cambios, select: selectMuestra });
      const dif = diferencias(actual as unknown as Record<string, unknown>, cambios);
      if (Object.keys(dif).length)
        await auditar(tx, { usuarioId: u.id, entidad: "Muestra", entidadId: id, accion: "EDITAR", cambios: dif });
      const estadoParte = await recalcularEstadoParte(tx, actual.parteId);
      return { muestra: m, estadoParte };
    });
    return res;
  });
}
