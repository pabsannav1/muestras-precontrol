import type { Prisma } from "@prisma/client";

/** Siguiente número de parte legible: P-2026-0001. */
export async function siguienteNumeroParte(tx: Prisma.TransactionClient, anio: number): Promise<string> {
  const c = await tx.contador.upsert({
    where: { anio },
    create: { anio, ultimo: 1 },
    update: { ultimo: { increment: 1 } },
  });
  return `P-${anio}-${String(c.ultimo).padStart(4, "0")}`;
}

/** Siguiente referencia de muestra dentro del parte: T-1, T-2… */
export async function siguienteOrdenMuestra(tx: Prisma.TransactionClient, parteId: string): Promise<number> {
  const max = await tx.muestra.aggregate({ where: { parteId }, _max: { orden: true } });
  return (max._max.orden ?? 0) + 1;
}

export const referenciaMuestra = (orden: number) => `T-${orden}`;
