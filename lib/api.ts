import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";

/** Envuelve un handler de API traduciendo errores a respuestas JSON. */
export async function manejar(fn: () => Promise<unknown>) {
  try {
    const data = await fn();
    return data instanceof Response ? data : NextResponse.json(data ?? { ok: true });
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof ZodError)
      return NextResponse.json({ error: "Datos no válidos", detalles: e.flatten() }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function leerJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "JSON no válido");
  }
}
