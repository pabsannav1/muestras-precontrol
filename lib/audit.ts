import type { Prisma } from "@prisma/client";

export async function auditar(
  tx: Prisma.TransactionClient,
  a: { usuarioId: string | null; entidad: string; entidadId: string; accion: string; cambios?: unknown },
) {
  await tx.auditLog.create({
    data: {
      usuarioId: a.usuarioId,
      entidad: a.entidad,
      entidadId: a.entidadId,
      accion: a.accion,
      cambios: a.cambios === undefined ? null : JSON.stringify(a.cambios),
    },
  });
}

/** Diferencias campo a campo entre dos objetos planos. */
export function diferencias<T extends Record<string, unknown>>(antes: T, despues: Partial<T>) {
  const out: Record<string, { antes: unknown; despues: unknown }> = {};
  for (const k of Object.keys(despues)) {
    if (despues[k] === undefined) continue;
    const a = antes[k] instanceof Date ? (antes[k] as Date).toISOString() : antes[k];
    const d = despues[k] instanceof Date ? (despues[k] as Date).toISOString() : despues[k];
    if (a !== d) out[k] = { antes: a, despues: d };
  }
  return out;
}
