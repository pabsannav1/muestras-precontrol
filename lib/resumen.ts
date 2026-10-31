/** Resumen "2 AFCH + 6 ACS" de las muestras de un parte, en el orden del catálogo. */
export function resumenMuestras(muestras: { tipoAgua: { nombre: string; orden: number } }[]) {
  const m = new Map<string, { n: number; orden: number }>();
  for (const x of muestras) {
    const e = m.get(x.tipoAgua.nombre) ?? { n: 0, orden: x.tipoAgua.orden };
    e.n++;
    m.set(x.tipoAgua.nombre, e);
  }
  return [...m.entries()]
    .sort((a, b) => a[1].orden - b[1].orden)
    .map(([k, v]) => `${v.n} ${k}`)
    .join(" + ");
}
