// Esquemas Zod compartidos entre formularios (cliente) y API (servidor).
import { z } from "zod";

/** Acepta "7,5", "7.5", 7.5, "" o null. Devuelve number, null (vacío) o NaN (no válido). */
export function parseDecimal(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  const s = String(v).trim().replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  if (!/^[-+]?\d*\.?\d+$|^[-+]?\d+\.$/.test(s)) return NaN;
  return Number(s);
}

const decimal = (min: number, max: number, etiqueta: string) =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v, ctx) => {
      const n = parseDecimal(v);
      if (n !== null && Number.isNaN(n)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${etiqueta}: número no válido` });
        return z.NEVER;
      }
      if (n !== null && (n < min || n > max)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${etiqueta}: fuera de rango (${min}–${max})` });
        return z.NEVER;
      }
      return n;
    });

const textoOpcional = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : null));

export const CAMPOS_MEDIDOS = ["temperatura", "temperaturaAC", "cloro", "conductividad", "ph", "hierro"] as const;

export const muestraDatosSchema = z.object({
  puntoRecogida: textoOpcional(200),
  temperatura: decimal(-20, 120, "Temperatura"),
  temperaturaAC: decimal(-20, 120, "Temperatura AC"),
  cloro: decimal(0, 100, "Cloro"),
  conductividad: decimal(0, 200000, "Conductividad"),
  ph: decimal(0, 14, "pH"),
  hierro: decimal(0, 1000, "Hierro"),
  fechaToma: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida")
    .nullish()
    .transform((v) => v || null),
  horaToma: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora no válida")
    .nullish()
    .transform((v) => v || null),
  observaciones: textoOpcional(2000),
});

export type MuestraDatosInput = z.input<typeof muestraDatosSchema>;
export type MuestraDatos = z.output<typeof muestraDatosSchema>;

export const muestraExtraSchema = z.object({
  tipoAnalisisId: z.string().min(1, "Elige el tipo de análisis"),
  tipoAguaId: z.string().min(1, "Elige el tipo de agua"),
});

export const pinLoginSchema = z.object({
  usuarioId: z.string().min(1),
  pin: z.string().regex(/^\d{4,6}$/, "El PIN tiene 4–6 dígitos"),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email no válido"),
  password: z.string().min(1, "Introduce la contraseña"),
});

export const rangoSchema = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ---------- Admin ----------

const fechaKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida");

export const clienteSchema = z.object({
  codigo: z.string().trim().min(1, "El código es obligatorio").max(40),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  direccion: textoOpcional(300),
  poblacion: textoOpcional(120),
  contacto: textoOpcional(200),
  telefono: textoOpcional(40),
  email: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null)
    .refine((v) => v === null || z.string().email().safeParse(v).success, "Email no válido"),
  notas: textoOpcional(2000),
  numeroContrato: textoOpcional(60),
  fechaContrato: fechaKey.nullish().or(z.literal("")).transform((v) => v || null),
  fechaRenovacion: fechaKey.nullish().or(z.literal("")).transform((v) => v || null),
  activo: z.boolean().default(true),
});

export type ClienteInput = z.input<typeof clienteSchema>;

export const TIPOS_VISITA = ["LIMPIEZA", "TOMA_1", "TOMA_2", "TOMA_3", "TOMA_4", "EXTRA"] as const;

export const ESTADOS_PARTE = ["PLANIFICADO", "EN_CURSO", "COMPLETADO", "VALIDADO", "CANCELADO"] as const;

export const lineaMuestrasSchema = z.object({
  tipoAnalisisId: z.string().min(1, "Elige el tipo de análisis"),
  tipoAguaId: z.string().min(1, "Elige el tipo de agua"),
  cantidad: z.coerce.number().int().min(1, "Mínimo 1").max(50, "Máximo 50"),
});

export const parteCamposSchema = z.object({
  clienteId: z.string().min(1, "Elige un cliente"),
  fechaPrevista: fechaKey,
  tecnicoId: z
    .string()
    .nullish()
    .transform((v) => v || null),
  numPedido: textoOpcional(60),
  tipoVisita: z
    .enum(TIPOS_VISITA)
    .nullish()
    .or(z.literal(""))
    .transform((v) => v || null),
  observaciones: textoOpcional(2000),
});

export const parteCrearSchema = parteCamposSchema.extend({
  lineas: z.array(lineaMuestrasSchema).max(30).default([]),
});

export const parteEditarSchema = parteCamposSchema.extend({
  estado: z.enum(ESTADOS_PARTE).optional(),
});

export const muestrasCrearSchema = z.object({
  lineas: z.array(lineaMuestrasSchema).min(1, "Añade al menos una línea").max(30),
});

/** Admin: cambia tipos y corrige los datos rellenados por el técnico. */
export const muestraAdminSchema = muestraDatosSchema.extend({
  tipoAnalisisId: z.string().min(1),
  tipoAguaId: z.string().min(1),
});

export const partesBloqueSchema = z.discriminatedUnion("accion", [
  z.object({
    accion: z.literal("asignar"),
    ids: z.array(z.string()).min(1).max(500),
    tecnicoId: z
      .string()
      .nullable()
      .transform((v) => v || null),
  }),
  z.object({ accion: z.literal("validar"), ids: z.array(z.string()).min(1).max(500) }),
]);
