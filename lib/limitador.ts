import "server-only";

// Limitador de intentos en memoria (suficiente para una sola instancia).
const MAX_FALLOS = 5;
const BLOQUEO_MS = 5 * 60 * 1000;

const fallos = new Map<string, { n: number; hasta: number }>();

export function bloqueadoHasta(clave: string): number | null {
  const f = fallos.get(clave);
  if (!f || f.n < MAX_FALLOS) return null;
  if (Date.now() > f.hasta) {
    fallos.delete(clave);
    return null;
  }
  return f.hasta;
}

export function registrarFallo(clave: string) {
  const f = fallos.get(clave) ?? { n: 0, hasta: 0 };
  f.n++;
  if (f.n >= MAX_FALLOS) f.hasta = Date.now() + BLOQUEO_MS;
  fallos.set(clave, f);
}

export function limpiarFallos(clave: string) {
  fallos.delete(clave);
}
