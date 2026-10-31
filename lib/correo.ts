// Texto del correo a administración con los datos de las muestras de un parte.
import { CAMPOS_NUMERICOS, numATexto } from "./muestra-campos";

type MuestraCorreo = {
  referencia: string;
  puntoRecogida: string | null;
  fechaToma: Date | null;
  horaToma: string | null;
  temperatura: number | null;
  temperaturaAC: number | null;
  cloro: number | null;
  conductividad: number | null;
  ph: number | null;
  hierro: number | null;
  tipoAnalisis: { nombre: string };
  tipoAgua: { nombre: string };
};

const fmtFecha = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

export function correoMuestras(parte: {
  numero: string;
  numPedido: string | null;
  cliente: { codigo: string; nombre: string; poblacion: string | null; direccion?: string | null };
  muestras: MuestraCorreo[];
}) {
  const cliente = `${parte.cliente.nombre} (${parte.cliente.codigo})`;
  const lineas = parte.muestras.map((m) => {
    const fecha = m.fechaToma ? `${fmtFecha.format(m.fechaToma)}${m.horaToma ? ` ${m.horaToma}` : ""}` : "sin fecha";
    const medidos = CAMPOS_NUMERICOS.filter((c) => m[c.campo as keyof MuestraCorreo] !== null)
      .map((c) => `${c.corto} ${numATexto(m[c.campo as keyof MuestraCorreo] as number)}${c.unidad ? ` ${c.unidad}` : ""}`)
      .join(", ");
    const parametros = `${m.tipoAnalisis.nombre} (${m.tipoAgua.nombre})${medidos ? ` – ${medidos}` : ""}`;
    return `${m.referencia} | ${cliente} | ${fecha} | ${m.puntoRecogida ?? "sin punto"} | ${parametros}`;
  });

  const lugar = [parte.cliente.direccion, parte.cliente.poblacion].filter(Boolean).join(", ");
  const asunto = `Muestras parte ${parte.numero} – ${parte.cliente.nombre}`;
  const cuerpo = [
    "Hola,",
    "",
    `Datos de las muestras del parte ${parte.numero}${parte.numPedido ? ` (pedido ${parte.numPedido})` : ""}:`,
    `Cliente: ${cliente}${lugar ? ` – ${lugar}` : ""}`,
    "",
    "Muestra | Cliente | Fecha y hora | Lugar | Parámetros",
    ...lineas,
    "",
    "Un saludo.",
  ].join("\n");
  return { asunto, cuerpo };
}
