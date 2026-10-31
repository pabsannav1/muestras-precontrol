// Compatible con el runtime edge (middleware): solo usa jose.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "tm_session";

export type Rol = "ADMIN" | "TECNICO";

export type SessionPayload = {
  uid: string;
  rol: Rol;
  nombre: string;
};

export const DURACION_SESION: Record<Rol, number> = {
  ADMIN: 60 * 60 * 12, // 12 h
  TECNICO: 60 * 60 * 24 * 30, // 30 días en el móvil
};

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET no definido o demasiado corto (mín. 32 caracteres)");
  return new TextEncoder().encode(s);
}

export async function firmarSesion(p: SessionPayload): Promise<string> {
  return new SignJWT({ rol: p.rol, nombre: p.nombre })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.uid)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION[p.rol]}s`)
    .sign(secret());
}

export async function verificarSesion(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub || (payload.rol !== "ADMIN" && payload.rol !== "TECNICO")) return null;
    return { uid: payload.sub, rol: payload.rol, nombre: String(payload.nombre ?? "") };
  } catch {
    return null;
  }
}
