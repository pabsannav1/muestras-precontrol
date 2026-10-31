import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { HttpError, type UsuarioSesion } from "./auth";
import { ESTADOS_ABIERTOS, ESTADOS_EDITABLES_TECNICO } from "./estado";
import { dateToKey, keyToDate } from "./fechas";

const selectTarjeta = {
  id: true,
  numero: true,
  fechaPrevista: true,
  numPedido: true,
  estado: true,
  cliente: { select: { nombre: true, poblacion: true } },
  muestras: { select: { estado: true, tipoAgua: { select: { nombre: true, orden: true } } } },
} satisfies Prisma.ParteSelect;

type ParteTarjetaRaw = Prisma.ParteGetPayload<{ select: typeof selectTarjeta }>;

export type ProgresoAgua = { tipoAgua: string; tomadas: number; total: number };

export type ParteTarjeta = {
  id: string;
  numero: string;
  fecha: string;
  numPedido: string | null;
  estado: ParteTarjetaRaw["estado"];
  cliente: string;
  poblacion: string | null;
  progreso: ProgresoAgua[];
  tomadas: number;
  total: number;
};

function progresoPorAgua(muestras: ParteTarjetaRaw["muestras"]): ProgresoAgua[] {
  const map = new Map<string, ProgresoAgua & { orden: number }>();
  for (const m of muestras) {
    const p = map.get(m.tipoAgua.nombre) ?? { tipoAgua: m.tipoAgua.nombre, orden: m.tipoAgua.orden, tomadas: 0, total: 0 };
    p.total++;
    if (m.estado === "TOMADA") p.tomadas++;
    map.set(m.tipoAgua.nombre, p);
  }
  return [...map.values()]
    .sort((a, b) => a.orden - b.orden)
    .map((p) => ({ tipoAgua: p.tipoAgua, tomadas: p.tomadas, total: p.total }));
}

function aTarjeta(p: ParteTarjetaRaw): ParteTarjeta {
  const progreso = progresoPorAgua(p.muestras);
  return {
    id: p.id,
    numero: p.numero,
    fecha: dateToKey(p.fechaPrevista),
    numPedido: p.numPedido,
    estado: p.estado,
    cliente: p.cliente.nombre,
    poblacion: p.cliente.poblacion,
    progreso,
    tomadas: progreso.reduce((s, x) => s + x.tomadas, 0),
    total: progreso.reduce((s, x) => s + x.total, 0),
  };
}

const ordenTarjetas: Prisma.ParteOrderByWithRelationInput[] = [{ fechaPrevista: "asc" }, { numero: "asc" }];

/** Partes del técnico entre dos días (incl.) + atrasados (días pasados sin completar). */
export async function partesTecnico(tecnicoId: string, desde: string, hasta: string, hoy: string) {
  const [partes, atrasados] = await Promise.all([
    prisma.parte.findMany({
      where: {
        tecnicoId,
        estado: { not: "CANCELADO" },
        fechaPrevista: { gte: keyToDate(desde), lte: keyToDate(hasta) },
      },
      select: selectTarjeta,
      orderBy: ordenTarjetas,
    }),
    prisma.parte.findMany({
      where: { tecnicoId, estado: { in: ESTADOS_ABIERTOS }, fechaPrevista: { lt: keyToDate(hoy) } },
      select: selectTarjeta,
      orderBy: ordenTarjetas,
    }),
  ]);
  return { partes: partes.map(aTarjeta), atrasados: atrasados.map(aTarjeta) };
}

/** Partes completados/validados de días anteriores (solo consulta). */
export async function partesHechos(tecnicoId: string, hoy: string, limite = 100) {
  const partes = await prisma.parte.findMany({
    where: { tecnicoId, estado: { in: ["COMPLETADO", "VALIDADO"] }, fechaPrevista: { lt: keyToDate(hoy) } },
    select: selectTarjeta,
    orderBy: [{ fechaPrevista: "desc" }, { numero: "desc" }],
    take: limite,
  });
  return partes.map(aTarjeta);
}

export const selectMuestra = {
  id: true,
  referencia: true,
  orden: true,
  estado: true,
  puntoRecogida: true,
  temperatura: true,
  temperaturaAC: true,
  cloro: true,
  conductividad: true,
  ph: true,
  hierro: true,
  fechaToma: true,
  horaToma: true,
  observaciones: true,
  tomadaEn: true,
  tipoAnalisis: { select: { id: true, nombre: true } },
  tipoAgua: { select: { id: true, nombre: true, orden: true } },
  tomadaPor: { select: { nombre: true } },
} satisfies Prisma.MuestraSelect;

export async function parteDetalle(id: string) {
  return prisma.parte.findUnique({
    where: { id },
    select: {
      id: true,
      numero: true,
      fechaPrevista: true,
      numPedido: true,
      estado: true,
      observaciones: true,
      tecnicoId: true,
      tecnico: { select: { nombre: true } },
      cliente: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          direccion: true,
          poblacion: true,
          contacto: true,
          telefono: true,
          email: true,
          notas: true,
        },
      },
      muestras: { select: selectMuestra, orderBy: { orden: "asc" } },
    },
  });
}

export type ParteDetalle = NonNullable<Awaited<ReturnType<typeof parteDetalle>>>;

/** Comprueba que el usuario puede ver el parte (admin: todos; técnico: los suyos). */
export function comprobarAcceso(u: UsuarioSesion, parte: { tecnicoId: string | null }) {
  if (u.rol === "ADMIN") return;
  if (parte.tecnicoId !== u.id) throw new HttpError(404, "Parte no encontrado");
}

/** Comprueba que el técnico puede modificar el parte (no validado ni cancelado). */
export function comprobarEditable(u: UsuarioSesion, parte: { tecnicoId: string | null; estado: ParteTarjeta["estado"] }) {
  comprobarAcceso(u, parte);
  if (u.rol === "TECNICO" && !ESTADOS_EDITABLES_TECNICO.includes(parte.estado))
    throw new HttpError(409, "El parte está validado o cancelado y no se puede modificar");
}

/** Puntos de recogida usados antes en el mismo cliente, más frecuentes primero. */
export async function sugerenciasPuntos(clienteId: string, limite = 30): Promise<string[]> {
  const filas = await prisma.muestra.groupBy({
    by: ["puntoRecogida"],
    where: { puntoRecogida: { not: null }, parte: { clienteId } },
    _count: { _all: true },
    orderBy: { _count: { puntoRecogida: "desc" } },
    take: limite,
  });
  return filas.map((f) => f.puntoRecogida!).filter(Boolean);
}

export async function catalogosActivos() {
  const [tiposAnalisis, tiposAgua] = await Promise.all([
    prisma.tipoAnalisis.findMany({ where: { activo: true }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    prisma.tipoAgua.findMany({ where: { activo: true }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
  ]);
  return { tiposAnalisis, tiposAgua };
}
