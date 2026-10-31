import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { EstadoIA } from "@prisma/client";

// PDFs de resultados del laboratorio: se guardan en disco (fuera de /public) y se leen con Gemini.

export const MAX_PDF = 15 * 1024 * 1024; // Gemini admite hasta ~20 MB en línea

const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), "storage"));

function rutaAbsoluta(ruta: string) {
  const abs = path.resolve(STORAGE_DIR, ruta);
  if (!abs.startsWith(STORAGE_DIR + path.sep)) throw new Error("Ruta no válida");
  return abs;
}

export async function guardarPdf(parteId: string, datos: Buffer): Promise<string> {
  const ruta = path.posix.join("resultados", parteId, `${randomUUID()}.pdf`);
  const abs = rutaAbsoluta(ruta);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, datos);
  return ruta;
}

export const leerPdf = (ruta: string) => readFile(rutaAbsoluta(ruta));

export async function borrarPdf(ruta: string) {
  await unlink(rutaAbsoluta(ruta)).catch(() => {});
}

export type ParametroResultado = {
  muestra: string;
  parametro: string;
  valor: string;
  unidad: string;
  enRojo: boolean;
};

export type AnalisisResultado = { resumen: string; parametros: ParametroResultado[] };

export type SalidaIA = { estadoIA: EstadoIA; analisis: string | null; hayRojos: boolean; error: string | null };

export const iaConfigurada = () => !!process.env.GEMINI_API_KEY;

const PROMPT = `Eres un asistente de un laboratorio de análisis de agua (control de Legionella y calidad del agua).
El PDF adjunto es un informe de resultados del laboratorio.
Extrae TODOS los parámetros analizados de TODAS las muestras del informe.
Para cada parámetro indica:
- muestra: identificación de la muestra tal como aparece (referencia, punto de muestreo o nº de muestra)
- parametro: nombre del parámetro
- valor: el resultado tal cual aparece (número o texto, p. ej. "<100", "Ausencia", "Presencia")
- unidad: unidad, o "" si no tiene
- enRojo: true SOLO si el texto del resultado (o de esa fila) está impreso en color rojo en el documento. Fíjate en el color real del texto, no en si el valor te parece alto. Si no está en rojo, false.
En "resumen" escribe una frase en español con lo más relevante (p. ej. qué parámetros salen en rojo).`;

const ESQUEMA = {
  type: "OBJECT",
  properties: {
    resumen: { type: "STRING" },
    parametros: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          muestra: { type: "STRING" },
          parametro: { type: "STRING" },
          valor: { type: "STRING" },
          unidad: { type: "STRING" },
          enRojo: { type: "BOOLEAN" },
        },
        required: ["muestra", "parametro", "valor", "unidad", "enRojo"],
      },
    },
  },
  required: ["resumen", "parametros"],
};

/** Lee el PDF con Gemini. Sin GEMINI_API_KEY devuelve SIN_CLAVE (queda pendiente). */
export async function analizarPdf(datos: Buffer): Promise<SalidaIA> {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) return { estadoIA: "SIN_CLAVE", analisis: null, hayRojos: false, error: null };
  const modelo = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": clave },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ inline_data: { mime_type: "application/pdf", data: datos.toString("base64") } }, { text: PROMPT }],
          },
        ],
        generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: ESQUEMA },
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message ?? `Gemini respondió ${res.status}`);
    const texto: string | undefined = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
    if (!texto) throw new Error("Gemini no devolvió resultado");
    const a = JSON.parse(texto) as AnalisisResultado;
    if (!Array.isArray(a.parametros)) throw new Error("Respuesta de Gemini sin parámetros");
    const analisis: AnalisisResultado = {
      resumen: String(a.resumen ?? ""),
      parametros: a.parametros.map((p) => ({
        muestra: String(p.muestra ?? ""),
        parametro: String(p.parametro ?? ""),
        valor: String(p.valor ?? ""),
        unidad: String(p.unidad ?? ""),
        enRojo: p.enRojo === true,
      })),
    };
    return { estadoIA: "OK", analisis: JSON.stringify(analisis), hayRojos: analisis.parametros.some((p) => p.enRojo), error: null };
  } catch (e) {
    return { estadoIA: "ERROR", analisis: null, hayRojos: false, error: e instanceof Error ? e.message.slice(0, 500) : "Error desconocido" };
  }
}
