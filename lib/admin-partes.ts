import "server-only";
import type { EstadoParte, Prisma } from "@prisma/client";
import { contiene, prisma } from "./prisma";
import { esKeyValida, keyToDate } from "./fechas";
import { ESTADOS_PARTE } from "./validations";

export type FiltrosPartes = {
  q?: string;
  estado?: string;
  tecnicoId?: string; // "sin" = sin asignar
  clienteId?: string;
  atencion?: string;
  desde?: string;
  hasta?: string;
};

export function wherePartes(f: FiltrosPartes): Prisma.ParteWhereInput {
  const q = f.q?.trim();
  const fecha: Prisma.DateTimeFilter = {};
  if (esKeyValida(f.desde)) fecha.gte = keyToDate(f.desde);
  if (esKeyValida(f.hasta)) fecha.lte = keyToDate(f.hasta);
  return {
    ...(f.estado && (ESTADOS_PARTE as readonly string[]).includes(f.estado) && { estado: f.estado as EstadoParte }),
    ...(f.tecnicoId && { tecnicoId: f.tecnicoId === "sin" ? null : f.tecnicoId }),
    ...(f.clienteId && { clienteId: f.clienteId }),
    ...(f.atencion === "1" && { atencion: true }),
    ...(Object.keys(fecha).length && { fechaPrevista: fecha }),
    ...(q && {
      OR: [
        { numero: contiene(q) },
        { numPedido: contiene(q) },
        { cliente: { nombre: contiene(q) } },
        { cliente: { codigo: contiene(q) } },
        { cliente: { poblacion: contiene(q) } },
      ],
    }),
  };
}

export const selectFilaParte = {
  id: true,
  numero: true,
  fechaPrevista: true,
  numPedido: true,
  estado: true,
  tipoVisita: true,
  atencion: true,
  cliente: { select: { id: true, codigo: true, nombre: true, poblacion: true } },
  tecnico: { select: { id: true, nombre: true, color: true } },
  muestras: { select: { estado: true, tipoAgua: { select: { nombre: true, orden: true } } } },
} satisfies Prisma.ParteSelect;

export async function listarPartes(f: FiltrosPartes, pagina = 1, porPagina = 50) {
  const where = wherePartes(f);
  const [total, partes] = await Promise.all([
    prisma.parte.count({ where }),
    prisma.parte.findMany({
      where,
      select: selectFilaParte,
      orderBy: [{ fechaPrevista: "desc" }, { numero: "desc" }],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ]);
  return { total, partes };
}

export async function parteAdmin(id: string) {
  return prisma.parte.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, codigo: true, nombre: true, poblacion: true, direccion: true } },
      tecnico: { select: { id: true, nombre: true, color: true } },
      creadoPor: { select: { nombre: true } },
      resultados: { orderBy: { subidoEn: "desc" } },
      muestras: {
        orderBy: { orden: "asc" },
        include: {
          tipoAnalisis: { select: { id: true, nombre: true } },
          tipoAgua: { select: { id: true, nombre: true, orden: true } },
          tomadaPor: { select: { nombre: true } },
        },
      },
    },
  });
}
