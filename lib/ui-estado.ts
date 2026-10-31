import type { EstadoParte } from "@prisma/client";

export const ESTADO_PARTE: Record<EstadoParte, { label: string; clase: string; barra: string }> = {
  PLANIFICADO: { label: "Planificado", clase: "bg-slate-100 text-slate-700 border-slate-200", barra: "bg-slate-400" },
  EN_CURSO: { label: "En curso", clase: "bg-amber-100 text-amber-800 border-amber-200", barra: "bg-amber-500" },
  COMPLETADO: { label: "Completado", clase: "bg-emerald-100 text-emerald-800 border-emerald-200", barra: "bg-emerald-500" },
  VALIDADO: { label: "Validado", clase: "bg-sky-100 text-sky-800 border-sky-200", barra: "bg-sky-600" },
  CANCELADO: { label: "Cancelado", clase: "bg-rose-100 text-rose-700 border-rose-200 line-through", barra: "bg-rose-400" },
};
