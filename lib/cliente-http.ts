// Helper de cliente para llamar a la API y obtener el mensaje de error legible.

export class ErrorApi extends Error {
  constructor(message: string, public detalles?: { fieldErrors?: Record<string, string[]> }) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, method = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ErrorApi("Sin conexión");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ErrorApi(data.error ?? `Error ${res.status}`, data.detalles);
  return data as T;
}

/** Primer mensaje por campo a partir de los detalles de Zod de la API. */
export function erroresCampos(e: unknown): Record<string, string> {
  const fe = e instanceof ErrorApi ? e.detalles?.fieldErrors : undefined;
  return Object.fromEntries(Object.entries(fe ?? {}).map(([k, v]) => [k, v[0]]));
}
