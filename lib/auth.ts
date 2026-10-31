import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import {
  DURACION_SESION,
  SESSION_COOKIE,
  firmarSesion,
  verificarSesion,
  type Rol,
  type SessionPayload,
} from "./session";

export async function crearSesion(p: SessionPayload) {
  const token = await firmarSesion(p);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SESION[p.rol],
  });
}

export async function cerrarSesion() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Usuario de la sesión, comprobando en BD que sigue activo. */
export async function usuarioActual() {
  const jar = await cookies();
  const s = await verificarSesion(jar.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const u = await prisma.usuario.findUnique({
    where: { id: s.uid },
    select: { id: true, nombre: true, rol: true, activo: true, color: true },
  });
  if (!u || !u.activo || u.rol !== s.rol) return null;
  return u;
}

export type UsuarioSesion = NonNullable<Awaited<ReturnType<typeof usuarioActual>>>;

/** Para páginas: redirige al login si no hay sesión válida con ese rol. */
export async function requerirPagina(rol: Rol): Promise<UsuarioSesion> {
  const u = await usuarioActual();
  if (!u || u.rol !== rol) redirect(rol === "ADMIN" ? "/admin/login" : "/login");
  return u;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Para la API: lanza HttpError 401/403. */
export async function requerirApi(rol?: Rol): Promise<UsuarioSesion> {
  const u = await usuarioActual();
  if (!u) throw new HttpError(401, "No autenticado");
  if (rol && u.rol !== rol) throw new HttpError(403, "Sin permiso");
  return u;
}
