// Reglas de estado de muestras y partes (sección 4 de la especificación).
import type { EstadoParte, Prisma } from "@prisma/client";
import { CAMPOS_MEDIDOS, type MuestraDatos } from "./validations";

type DatosMedibles = Pick<MuestraDatos, "puntoRecogida" | (typeof CAMPOS_MEDIDOS)[number]>;

/** Una muestra está TOMADA con punto de recogida y al menos un dato medido. */
export function muestraTomada(d: DatosMedibles): boolean {
  return !!d.puntoRecogida && CAMPOS_MEDIDOS.some((c) => d[c] !== null && d[c] !== undefined);
}

/** ¿El técnico ha empezado a rellenar algo? */
export function muestraConDatos(d: DatosMedibles & { observaciones?: string | null }): boolean {
  return !!d.puntoRecogida || !!d.observaciones || CAMPOS_MEDIDOS.some((c) => d[c] !== null && d[c] !== undefined);
}

export const ESTADOS_EDITABLES_TECNICO: EstadoParte[] = ["PLANIFICADO", "EN_CURSO", "COMPLETADO"];
export const ESTADOS_ABIERTOS: EstadoParte[] = ["PLANIFICADO", "EN_CURSO"];

/**
 * Recalcula el estado del parte tras un cambio en sus muestras.
 * PLANIFICADO → EN_CURSO al rellenar la primera muestra; → COMPLETADO cuando todas están TOMADA.
 * Nunca retrocede (un parte cerrado a mano sigue COMPLETADO). No toca VALIDADO ni CANCELADO.
 */
export async function recalcularEstadoParte(
  tx: Prisma.TransactionClient,
  parteId: string,
): Promise<EstadoParte> {
  const parte = await tx.parte.findUniqueOrThrow({
    where: { id: parteId },
    select: {
      estado: true,
      muestras: {
        select: {
          estado: true,
          puntoRecogida: true,
          observaciones: true,
          temperatura: true,
          temperaturaAC: true,
          cloro: true,
          conductividad: true,
          ph: true,
          hierro: true,
        },
      },
    },
  });
  if (parte.estado === "VALIDADO" || parte.estado === "CANCELADO") return parte.estado;

  const total = parte.muestras.length;
  const tomadas = parte.muestras.filter((m) => m.estado === "TOMADA").length;
  const empezado = parte.muestras.some((m) => muestraConDatos(m));

  let nuevo: EstadoParte = parte.estado;
  if (total > 0 && tomadas === total) nuevo = "COMPLETADO";
  else if (parte.estado === "PLANIFICADO" && empezado) nuevo = "EN_CURSO";

  if (nuevo !== parte.estado) await tx.parte.update({ where: { id: parteId }, data: { estado: nuevo } });
  return nuevo;
}
