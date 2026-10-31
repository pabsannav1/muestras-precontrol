import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { HttpError } from "./auth";
import { referenciaMuestra, siguienteNumeroParte, siguienteOrdenMuestra } from "./numeracion";
import type { z } from "zod";
import type { clienteSchema, lineaMuestrasSchema } from "./validations";
import { keyToDate } from "./fechas";

/** Datos de cliente validados → datos para Prisma (fechas como Date). */
export function datosCliente(d: z.output<typeof clienteSchema>) {
  return {
    ...d,
    fechaContrato: d.fechaContrato ? keyToDate(d.fechaContrato) : null,
    fechaRenovacion: d.fechaRenovacion ? keyToDate(d.fechaRenovacion) : null,
  };
}

type Linea = z.output<typeof lineaMuestrasSchema>;

/** Comprueba que cliente y técnico existen y son válidos para asignar. */
export async function comprobarRelacionesParte(d: { clienteId: string; tecnicoId: string | null }) {
  const [cliente, tecnico] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: d.clienteId }, select: { id: true } }),
    d.tecnicoId ? prisma.usuario.findUnique({ where: { id: d.tecnicoId }, select: { rol: true, activo: true } }) : null,
  ]);
  if (!cliente) throw new HttpError(400, "Cliente no encontrado");
  if (d.tecnicoId && (!tecnico || tecnico.rol !== "TECNICO" || !tecnico.activo))
    throw new HttpError(400, "Técnico no válido o inactivo");
}

export async function comprobarTipos(pares: { tipoAnalisisId: string; tipoAguaId: string }[]) {
  const ta = new Set(pares.map((p) => p.tipoAnalisisId));
  const tg = new Set(pares.map((p) => p.tipoAguaId));
  const [na, ng] = await Promise.all([
    prisma.tipoAnalisis.count({ where: { id: { in: [...ta] } } }),
    prisma.tipoAgua.count({ where: { id: { in: [...tg] } } }),
  ]);
  if (na !== ta.size || ng !== tg.size) throw new HttpError(400, "Tipo de análisis o de agua no válido");
}

/** Crea `cantidad` muestras por línea al final del parte. Devuelve cuántas creó. */
export async function crearMuestras(tx: Prisma.TransactionClient, parteId: string, lineas: Linea[]) {
  let orden = await siguienteOrdenMuestra(tx, parteId);
  const data = lineas.flatMap((l) =>
    Array.from({ length: l.cantidad }, () => {
      const o = orden++;
      return { parteId, orden: o, referencia: referenciaMuestra(o), tipoAnalisisId: l.tipoAnalisisId, tipoAguaId: l.tipoAguaId };
    }),
  );
  if (data.length) await tx.muestra.createMany({ data });
  return data.length;
}

export async function nuevoNumeroParte(tx: Prisma.TransactionClient, fechaPrevista: string) {
  return siguienteNumeroParte(tx, Number(fechaPrevista.slice(0, 4)));
}

/**
 * Renumera T-1…T-n sin huecos. Solo se usa mientras el parte está PLANIFICADO
 * (aún no hay etiquetas puestas en frascos); después las referencias son fijas.
 */
export async function renumerarMuestras(tx: Prisma.TransactionClient, parteId: string) {
  const muestras = await tx.muestra.findMany({ where: { parteId }, orderBy: { orden: "asc" }, select: { id: true, orden: true } });
  if (muestras.every((m, i) => m.orden === i + 1)) return;
  // Dos pasos para no chocar con el índice único (parteId, referencia)
  for (const m of muestras) await tx.muestra.update({ where: { id: m.id }, data: { referencia: `tmp-${m.id}` } });
  for (const [i, m] of muestras.entries())
    await tx.muestra.update({ where: { id: m.id }, data: { orden: i + 1, referencia: referenciaMuestra(i + 1) } });
}

export async function tecnicosActivos() {
  return prisma.usuario.findMany({
    where: { rol: "TECNICO", activo: true },
    select: { id: true, nombre: true, color: true },
    orderBy: { nombre: "asc" },
  });
}
