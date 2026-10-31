// Campos de datos de una muestra, compartidos por el formulario del técnico y el del admin.

export type ValoresMuestra = {
  puntoRecogida: string;
  temperatura: string;
  temperaturaAC: string;
  cloro: string;
  conductividad: string;
  ph: string;
  hierro: string;
  fechaToma: string;
  horaToma: string;
  observaciones: string;
};

export const CAMPOS_NUMERICOS: { campo: keyof ValoresMuestra; label: string; corto: string; unidad: string }[] = [
  { campo: "temperatura", label: "Temperatura", corto: "T", unidad: "°C" },
  { campo: "temperaturaAC", label: "Temperatura AC", corto: "T AC", unidad: "°C" },
  { campo: "cloro", label: "Cloro", corto: "Cl", unidad: "ppm" },
  { campo: "conductividad", label: "Conductividad", corto: "Cond.", unidad: "µS/cm" },
  { campo: "ph", label: "pH", corto: "pH", unidad: "" },
  { campo: "hierro", label: "Hierro", corto: "Fe", unidad: "mg/L" },
];

/** Número para mostrar/editar con coma decimal. */
export const numATexto = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v).replace(".", ","));

type MuestraBD = {
  puntoRecogida: string | null;
  temperatura: number | null;
  temperaturaAC: number | null;
  cloro: number | null;
  conductividad: number | null;
  ph: number | null;
  hierro: number | null;
  fechaToma: Date | string | null;
  horaToma: string | null;
  observaciones: string | null;
};

export function valoresDesdeMuestra(m: MuestraBD, porDefecto: { fecha: string; hora: string }): ValoresMuestra {
  const fecha = m.fechaToma ? (typeof m.fechaToma === "string" ? m.fechaToma : m.fechaToma.toISOString()).slice(0, 10) : porDefecto.fecha;
  return {
    puntoRecogida: m.puntoRecogida ?? "",
    temperatura: numATexto(m.temperatura),
    temperaturaAC: numATexto(m.temperaturaAC),
    cloro: numATexto(m.cloro),
    conductividad: numATexto(m.conductividad),
    ph: numATexto(m.ph),
    hierro: numATexto(m.hierro),
    fechaToma: fecha,
    horaToma: m.horaToma ?? porDefecto.hora,
    observaciones: m.observaciones ?? "",
  };
}
