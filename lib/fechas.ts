// Los días se manejan como claves "YYYY-MM-DD" y se guardan en BD a las 00:00 UTC.

export const APP_TZ = process.env.APP_TZ || process.env.NEXT_PUBLIC_APP_TZ || "Europe/Madrid";

export function hoyKey(tz = APP_TZ): string {
  // en-CA da formato YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

export function horaActual(tz = APP_TZ): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export function keyToDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function dateToKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(key: string, n: number): string {
  const d = keyToDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return dateToKey(d);
}

/** Lunes de la semana que contiene `key`. */
export function lunesDe(key: string): string {
  const dow = (keyToDate(key).getUTCDay() + 6) % 7; // 0 = lunes
  return addDays(key, -dow);
}

export function rangoDias(desde: string, hasta: string): string[] {
  const out: string[] = [];
  for (let k = desde; k <= hasta; k = addDays(k, 1)) out.push(k);
  return out;
}

export function esKeyValida(key: string | null | undefined): key is string {
  return !!key && /^\d{4}-\d{2}-\d{2}$/.test(key) && !isNaN(keyToDate(key).getTime());
}

const fmtDia = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const fmtLargo = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export function formatoDia(key: string): string {
  return fmtDia.format(keyToDate(key));
}

export function formatoLargo(key: string): string {
  return fmtLargo.format(keyToDate(key));
}
