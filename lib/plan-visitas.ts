// Plan anual de visitas de un contrato (seguro en cliente y servidor).
import type { TipoVisita } from "@prisma/client";
import { addDays, keyToDate, dateToKey } from "./fechas";

export { TIPOS_VISITA } from "./validations";

export const TIPO_VISITA: Record<TipoVisita, { label: string; corto: string; descripcion: string }> = {
  LIMPIEZA: { label: "Limpieza y desinfección", corto: "L+D", descripcion: "A la firma del contrato" },
  TOMA_1: { label: "1ª toma de muestras", corto: "1ª", descripcion: "Entre 15 y 30 días después de la limpieza" },
  TOMA_2: { label: "2ª toma de muestras", corto: "2ª", descripcion: "A los 3 meses" },
  TOMA_3: { label: "3ª toma de muestras", corto: "3ª", descripcion: "A los 6 meses" },
  TOMA_4: { label: "4ª toma de muestras", corto: "4ª", descripcion: "A los 9 meses" },
  EXTRA: { label: "Toma extra", corto: "Extra", descripcion: "Por positivos en los controles" },
};

function addMeses(key: string, n: number): string {
  const d = keyToDate(key);
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimo));
  return dateToKey(d);
}

/**
 * Ventana prevista de cada visita a partir de la fecha de la limpieza
 * (la real si ya hay parte de limpieza; si no, la firma del contrato).
 * Las tomas trimestrales se cuentan desde la limpieza con ±15 días de margen.
 */
export function ventanaVisita(tipo: Exclude<TipoVisita, "EXTRA">, inicio: string): { desde: string; hasta: string; ideal: string } {
  switch (tipo) {
    case "LIMPIEZA":
      return { desde: inicio, hasta: inicio, ideal: inicio };
    case "TOMA_1":
      return { desde: addDays(inicio, 15), hasta: addDays(inicio, 30), ideal: addDays(inicio, 21) };
    default: {
      const meses = { TOMA_2: 3, TOMA_3: 6, TOMA_4: 9 }[tipo];
      const ideal = addMeses(inicio, meses);
      return { desde: addDays(ideal, -15), hasta: addDays(ideal, 15), ideal };
    }
  }
}

export { addMeses };
